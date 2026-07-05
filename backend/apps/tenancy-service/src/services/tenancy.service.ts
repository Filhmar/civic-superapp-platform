import { Injectable } from '@nestjs/common';
import { ModuleName, TenantConfig, TenantContext, TenantKind, TenantStatus, rpcError } from '@app/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve a tenant by tenant id OR mobile bundle id (com.<location>.app). */
  async resolve(key: string): Promise<TenantContext> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: key }, { bundleId: key }] },
      include: { configs: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!tenant) rpcError(404, `Unknown tenant: ${key}`);
    if (tenant.status !== 'active') rpcError(403, `Tenant ${tenant.id} is not active`);
    const latest = tenant.configs[0];
    if (!latest) rpcError(500, `Tenant ${tenant.id} has no configuration`);
    const config = latest.config as unknown as TenantConfig;
    return {
      tenantId: tenant.id,
      kind: tenant.kind as TenantKind,
      status: tenant.status as TenantStatus,
      ticketPrefix: tenant.ticketPrefix,
      residentIdPrefix: tenant.residentIdPrefix,
      modules: config.modules as Record<ModuleName, boolean>,
      configVersion: latest.version,
    };
  }

  /** Full latest tenant config (the JSON the app boots from). */
  async getConfig(tenantId: string): Promise<{ version: number; config: TenantConfig }> {
    const latest = await this.prisma.tenantConfigVersion.findFirst({
      where: { tenantId },
      orderBy: { version: 'desc' },
    });
    if (!latest) rpcError(404, `No config for tenant ${tenantId}`);
    return { version: latest.version, config: latest.config as unknown as TenantConfig };
  }

  /** Append a new config version (config is versioned data — never mutated in place). */
  async upsertConfig(tenantId: string, config: TenantConfig): Promise<{ version: number }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) rpcError(404, `Unknown tenant: ${tenantId}`);
    const latest = await this.prisma.tenantConfigVersion.findFirst({
      where: { tenantId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;
    await this.prisma.tenantConfigVersion.create({
      data: { tenantId, version, config: config as object },
    });
    return { version };
  }

  async list(): Promise<{ id: string; name: string; kind: string; status: string; bundleId: string }[]> {
    const tenants = await this.prisma.tenant.findMany({ orderBy: { id: 'asc' } });
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      kind: t.kind,
      status: t.status,
      bundleId: t.bundleId,
    }));
  }
}
