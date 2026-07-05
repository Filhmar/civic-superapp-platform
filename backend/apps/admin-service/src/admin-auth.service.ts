import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppConfigService, rpcError } from '@app/common';
import { PrismaService } from './prisma.service';

export type AdminRole = 'platform_admin' | 'tenant_admin';

export interface AdminAccessPayload {
  sub: string;
  role: AdminRole;
  tenantId: string | null;
  sessionId: string;
  plane: 'admin';
}

/** Same digest discipline as resident sessions: SHA-256, never bcrypt on JWTs. */
function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
function digestMatches(token: string, stored: string): boolean {
  const a = Buffer.from(digestToken(token));
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ADMIN_ACCESS_TTL = 900; // 15m
const ADMIN_REFRESH_TTL = 8 * 3600; // 8h working session

@Injectable()
export class AdminAuthService implements OnModuleInit {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  /** Bootstrap: seed the platform superadmin from env if none exists. */
  async onModuleInit(): Promise<void> {
    const email = this.config.get('ADMIN_SEED_EMAIL');
    const password = this.config.get('ADMIN_SEED_PASSWORD');
    if (!email || !password) return;
    const existing = await this.prisma.adminUser.findFirst({
      where: { role: 'platform_admin' },
    });
    if (existing) return;
    await this.prisma.adminUser.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        name: 'Platform Administrator',
        role: 'platform_admin',
      },
    });
    this.logger.log(`Seeded platform admin ${email}`);
  }

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    // Constant-shape failure: never reveal which factor failed.
    const ok = admin && admin.status === 'active' && (await bcrypt.compare(password, admin.passwordHash));
    if (!ok) rpcError(401, 'Invalid credentials');
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    const pair = await this.openSession(admin.id, admin.role as AdminRole, admin.tenantId);
    return { ...pair, admin: this.publicAdmin(admin) };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; sessionId: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.require('JWT_ADMIN_REFRESH_SECRET'),
      });
    } catch {
      rpcError(401, 'Invalid refresh token');
    }
    const session = await this.prisma.adminSession.findUnique({
      where: { id: payload.sessionId },
      include: { admin: true },
    });
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      rpcError(401, 'Session expired');
    }
    if (!digestMatches(refreshToken, session.refreshTokenHash)) {
      await this.prisma.adminSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });
      rpcError(401, 'Refresh token reuse detected');
    }
    if (session.admin.status !== 'active') rpcError(403, 'Account disabled');
    const newRefresh = this.signRefresh(session.adminId, session.id);
    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: digestToken(newRefresh), lastUsedAt: new Date() },
    });
    return {
      access_token: this.signAccess(
        session.adminId,
        session.admin.role as AdminRole,
        session.admin.tenantId,
        session.id,
      ),
      refresh_token: newRefresh,
      expires_in: ADMIN_ACCESS_TTL,
      admin: this.publicAdmin(session.admin),
    };
  }

  async logout(sessionId: string) {
    await this.prisma.adminSession.updateMany({
      where: { id: sessionId },
      data: { isActive: false },
    });
    return { logged_out: true };
  }

  async me(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) rpcError(404, 'Admin not found');
    return this.publicAdmin(admin);
  }

  async listUsers(scopeTenantId?: string) {
    const admins = await this.prisma.adminUser.findMany({
      where: scopeTenantId ? { tenantId: scopeTenantId } : {},
      orderBy: { createdAt: 'asc' },
    });
    return admins.map((a) => this.publicAdmin(a));
  }

  async createUser(input: {
    email: string;
    password: string;
    name: string;
    role: AdminRole;
    tenantId?: string;
  }) {
    if (input.role === 'tenant_admin' && !input.tenantId) {
      rpcError(400, 'tenant_admin requires a tenant_id');
    }
    if (input.role === 'platform_admin' && input.tenantId) {
      rpcError(400, 'platform_admin must not be tenant-scoped');
    }
    if (input.password.length < 10) rpcError(400, 'Password must be at least 10 characters');
    const existing = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
    if (existing) rpcError(409, 'Email already registered');
    const admin = await this.prisma.adminUser.create({
      data: {
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
        name: input.name,
        role: input.role,
        tenantId: input.tenantId ?? null,
      },
    });
    return this.publicAdmin(admin);
  }

  private async openSession(adminId: string, role: AdminRole, tenantId: string | null) {
    const sessionId = randomUUID();
    const refresh = this.signRefresh(adminId, sessionId);
    await this.prisma.adminSession.create({
      data: {
        id: sessionId,
        adminId,
        refreshTokenHash: digestToken(refresh),
        expiresAt: new Date(Date.now() + ADMIN_REFRESH_TTL * 1000),
      },
    });
    return {
      access_token: this.signAccess(adminId, role, tenantId, sessionId),
      refresh_token: refresh,
      expires_in: ADMIN_ACCESS_TTL,
    };
  }

  private signAccess(
    adminId: string,
    role: AdminRole,
    tenantId: string | null,
    sessionId: string,
  ): string {
    return this.jwt.sign(
      { sub: adminId, role, tenantId, sessionId, plane: 'admin' } satisfies AdminAccessPayload,
      { secret: this.config.require('JWT_ADMIN_ACCESS_SECRET'), expiresIn: ADMIN_ACCESS_TTL },
    );
  }

  private signRefresh(adminId: string, sessionId: string): string {
    return this.jwt.sign(
      { sub: adminId, sessionId, jti: randomUUID(), plane: 'admin', kind: 'refresh' },
      { secret: this.config.require('JWT_ADMIN_REFRESH_SECRET'), expiresIn: ADMIN_REFRESH_TTL },
    );
  }

  private publicAdmin(a: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string | null;
    status: string;
    lastLoginAt: Date | null;
  }) {
    return {
      admin_id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      tenant_id: a.tenantId,
      status: a.status,
      last_login_at: a.lastLoginAt?.toISOString() ?? null,
    };
  }
}
