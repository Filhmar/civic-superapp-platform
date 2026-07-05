import { TenancyService } from './tenancy.service';
import { PrismaService } from '../prisma.service';

const dasmaConfig = {
  modules: { egov: true, reports311: true, health: false },
};

function fakePrisma(overrides: Record<string, unknown> = {}): PrismaService {
  return {
    tenant: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'ph-cavite-dasmarinas',
        kind: 'city',
        status: 'active',
        bundleId: 'com.dasmarinas.app',
        name: 'MyDasma',
        ticketPrefix: 'DSM',
        residentIdPrefix: 'DSM',
        configs: [{ version: 3, config: dasmaConfig }],
      }),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    tenantConfigVersion: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe('TenancyService.resolve', () => {
  it('resolves by bundle id to a tenant context with prefixes and module flags', async () => {
    const service = new TenancyService(fakePrisma());
    const ctx = await service.resolve('com.dasmarinas.app');
    expect(ctx.tenantId).toBe('ph-cavite-dasmarinas');
    expect(ctx.ticketPrefix).toBe('DSM');
    expect(ctx.modules.reports311).toBe(true);
    expect(ctx.modules.health).toBe(false);
    expect(ctx.configVersion).toBe(3);
  });

  it('rejects unknown tenants with 404', async () => {
    const prisma = fakePrisma();
    (prisma.tenant.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new TenancyService(prisma);
    await expect(service.resolve('com.nowhere.app')).rejects.toMatchObject({
      error: { statusCode: 404 },
    });
  });

  it('rejects inactive tenants with 403', async () => {
    const prisma = fakePrisma();
    (prisma.tenant.findFirst as jest.Mock).mockResolvedValue({
      id: 't',
      status: 'suspended',
      configs: [],
    });
    const service = new TenancyService(prisma);
    await expect(service.resolve('t')).rejects.toMatchObject({
      error: { statusCode: 403 },
    });
  });
});
