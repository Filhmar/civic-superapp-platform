import { Injectable } from '@nestjs/common';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppConfigService, TenantContext, residentId, rpcError } from '@app/common';
import { RedisService } from '@app/redis';
import { PrismaService } from '../prisma.service';
import { TokenService } from './token.service';

/**
 * Refresh tokens are digested with SHA-256 before storage. bcrypt is WRONG here:
 * it truncates input at 72 bytes and JWTs from the same session share their first
 * 72 bytes, so rotation would be undetectable. The token is already a high-entropy
 * HMAC — a plain digest comparison is sufficient and constant-time.
 */
function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function digestMatches(token: string, storedDigest: string): boolean {
  const a = Buffer.from(digestToken(token));
  const b = Buffer.from(storedDigest);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: 'resident' | 'guest';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  /** Called after OTP verification: upsert the resident and open a session. */
  async loginVerifiedPhone(
    tenant: TenantContext,
    phoneNumber: string,
    deviceInfo?: string,
  ): Promise<TokenPair & { user: object }> {
    let user = await this.prisma.user.findUnique({
      where: {
        tenantId_phoneNumber: { tenantId: tenant.tenantId, phoneNumber },
      },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: { tenantId: tenant.tenantId, phoneNumber, verifiedResident: true },
      });
    }
    if (!user.residentId) {
      const year = new Date().getFullYear();
      // Atomic per-tenant-per-year counter → {PREFIX}-{year}-{seq}
      const [seqRow] = await this.prisma.$transaction([
        this.prisma.residentSequence.upsert({
          where: { tenantId_year: { tenantId: tenant.tenantId, year } },
          create: { tenantId: tenant.tenantId, year, seq: 1 },
          update: { seq: { increment: 1 } },
        }),
      ]);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          residentId: residentId(tenant.residentIdPrefix, year, seqRow.seq),
          verifiedResident: true,
        },
      });
    }
    const pair = await this.openSession(tenant, user.id, deviceInfo);
    return { ...pair, user: this.publicUser(user) };
  }

  async guest(tenant: TenantContext): Promise<TokenPair> {
    const guestId = `guest:${randomUUID()}`;
    const access = this.tokens.signAccess({
      sub: guestId,
      tenantId: tenant.tenantId,
      scope: 'guest',
      sessionId: guestId,
    });
    return {
      access_token: access,
      // Guests are browse-only and short-lived: no refresh token, no session row.
      refresh_token: '',
      expires_in: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      scope: 'guest',
    };
  }

  async refresh(tenant: TenantContext, refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = this.tokens.verifyRefresh(refreshToken);
    } catch {
      rpcError(401, 'Invalid refresh token');
    }
    if (payload.tenantId !== tenant.tenantId) rpcError(401, 'Token tenant mismatch');
    const session = await this.prisma.session.findUnique({ where: { id: payload.sessionId } });
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      rpcError(401, 'Session expired');
    }
    const matches = digestMatches(refreshToken, session.refreshTokenHash);
    if (!matches) {
      // Reuse of a rotated token → assume theft, kill the session.
      await this.prisma.session.update({ where: { id: session.id }, data: { isActive: false } });
      rpcError(401, 'Refresh token reuse detected');
    }
    const newRefresh = this.tokens.signRefresh({
      sub: session.userId,
      tenantId: tenant.tenantId,
      sessionId: session.id,
      kind: 'refresh',
    });
    await this.prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: digestToken(newRefresh), lastUsedAt: new Date() },
    });
    const access = this.tokens.signAccess({
      sub: session.userId,
      tenantId: tenant.tenantId,
      scope: 'resident',
      sessionId: session.id,
    });
    return {
      access_token: access,
      refresh_token: newRefresh,
      expires_in: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      scope: 'resident',
    };
  }

  async logout(tenant: TenantContext, sessionId: string): Promise<{ logged_out: true }> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, tenantId: tenant.tenantId },
      data: { isActive: false },
    });
    // Access tokens are stateless — flag the session so the gateway rejects them immediately.
    await this.redis.client.set(
      `session:revoked:${sessionId}`,
      '1',
      'EX',
      this.config.get('JWT_ACCESS_EXPIRES_IN'),
    );
    return { logged_out: true };
  }

  private async openSession(
    tenant: TenantContext,
    userId: string,
    deviceInfo?: string,
  ): Promise<TokenPair> {
    const sessionId = randomUUID();
    const refresh = this.tokens.signRefresh({
      sub: userId,
      tenantId: tenant.tenantId,
      sessionId,
      kind: 'refresh',
    });
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        tenantId: tenant.tenantId,
        refreshTokenHash: digestToken(refresh),
        deviceInfo,
        expiresAt: new Date(Date.now() + this.config.get('JWT_REFRESH_EXPIRES_IN') * 1000),
      },
    });
    const access = this.tokens.signAccess({
      sub: userId,
      tenantId: tenant.tenantId,
      scope: 'resident',
      sessionId,
    });
    return {
      access_token: access,
      refresh_token: refresh,
      expires_in: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      scope: 'resident',
    };
  }

  publicUser(user: {
    id: string;
    phoneNumber: string;
    name: string | null;
    unit: string | null;
    language: string;
    avatarUrl: string | null;
    residentId: string | null;
    verifiedResident: boolean;
  }): object {
    return {
      id: user.id,
      phone_number: user.phoneNumber,
      name: user.name,
      unit: user.unit,
      language: user.language,
      avatar_url: user.avatarUrl,
      resident_id: user.residentId,
      verified_resident: user.verifiedResident,
    };
  }
}
