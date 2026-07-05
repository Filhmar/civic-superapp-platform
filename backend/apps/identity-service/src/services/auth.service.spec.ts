import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { AppConfigService, TenantContext } from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RedisService } from '@app/redis';

const SECRET = 'x'.repeat(64);

const tenant: TenantContext = {
  tenantId: 'ph-test-city',
  kind: 'city',
  status: 'active',
  ticketPrefix: 'TST',
  residentIdPrefix: 'TST',
  modules: {} as TenantContext['modules'],
  configVersion: 1,
};

function makeConfig(): AppConfigService {
  const values: Record<string, unknown> = {
    JWT_ACCESS_SECRET: SECRET,
    JWT_REFRESH_SECRET: SECRET,
    JWT_ACCESS_EXPIRES_IN: 900,
    JWT_REFRESH_EXPIRES_IN: 604800,
  };
  return {
    get: (k: string) => values[k],
    require: (k: string) => values[k],
  } as unknown as AppConfigService;
}

function makeTokenService(): TokenService {
  return new TokenService(new JwtService({}), makeConfig());
}

describe('refresh token rotation', () => {
  it('signs distinct refresh tokens even in the same second (jti)', () => {
    const tokens = makeTokenService();
    const payload = {
      sub: 'u1',
      tenantId: tenant.tenantId,
      sessionId: 's1',
      kind: 'refresh' as const,
    };
    expect(tokens.signRefresh(payload)).not.toBe(tokens.signRefresh(payload));
  });

  it('detects reuse of a rotated token and kills the session', async () => {
    const tokens = makeTokenService();
    const sessions = new Map<string, { refreshTokenHash: string; isActive: boolean }>();
    const prisma = {
      session: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          const s = sessions.get(where.id);
          return Promise.resolve(
            s
              ? {
                  id: where.id,
                  userId: 'u1',
                  tenantId: tenant.tenantId,
                  isActive: s.isActive,
                  expiresAt: new Date(Date.now() + 100000),
                  refreshTokenHash: s.refreshTokenHash,
                }
              : null,
          );
        }),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: { refreshTokenHash?: string; isActive?: boolean };
          }) => {
            const s = sessions.get(where.id)!;
            if (data.refreshTokenHash) s.refreshTokenHash = data.refreshTokenHash;
            if (data.isActive === false) s.isActive = false;
            return Promise.resolve({});
          },
        ),
        create: jest.fn(({ data }: { data: { id: string; refreshTokenHash: string } }) => {
          sessions.set(data.id, { refreshTokenHash: data.refreshTokenHash, isActive: true });
          return Promise.resolve(data);
        }),
      },
      user: {},
    } as unknown as PrismaService;
    const redis = {
      client: { set: jest.fn().mockResolvedValue('OK') },
    } as unknown as RedisService;

    const auth = new AuthService(prisma, redis, tokens, makeConfig());
    // Open a session via the private path by reaching through refresh mechanics:
    const sessionId = 'sess-1';
    const first = tokens.signRefresh({
      sub: 'u1',
      tenantId: tenant.tenantId,
      sessionId,
      kind: 'refresh',
    });
    const { createHash } = await import('node:crypto');
    sessions.set(sessionId, {
      refreshTokenHash: createHash('sha256').update(first).digest('hex'),
      isActive: true,
    });

    const rotated = await auth.refresh(tenant, first);
    expect(rotated.refresh_token).not.toBe(first);

    // Reusing the pre-rotation token must 401 and deactivate the session.
    await expect(auth.refresh(tenant, first)).rejects.toMatchObject({
      error: { statusCode: 401 },
    });
    expect(sessions.get(sessionId)!.isActive).toBe(false);

    // Post-theft, even the newest token is dead.
    await expect(auth.refresh(tenant, rotated.refresh_token)).rejects.toMatchObject({
      error: { statusCode: 401 },
    });
  });

  it('rejects tokens minted for another tenant', async () => {
    const tokens = makeTokenService();
    const auth = new AuthService(
      { session: { findUnique: jest.fn() } } as unknown as PrismaService,
      { client: {} } as unknown as RedisService,
      tokens,
      makeConfig(),
    );
    const foreign = tokens.signRefresh({
      sub: 'u1',
      tenantId: 'ph-other-city',
      sessionId: 's9',
      kind: 'refresh',
    });
    await expect(auth.refresh(tenant, foreign)).rejects.toMatchObject({
      error: { statusCode: 401 },
    });
  });
});
