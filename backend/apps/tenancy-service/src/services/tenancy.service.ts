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

  /** Provision a new tenant: record + config v1 (Reference §4 step 1). */
  async createTenant(input: {
    id: string;
    kind: TenantKind;
    bundleId: string;
    name: string;
    config: TenantConfig;
  }): Promise<{ id: string; version: number }> {
    if (!/^[a-z0-9-]+$/.test(input.id)) rpcError(400, 'Tenant id must be kebab-case');
    const existing = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: input.id }, { bundleId: input.bundleId }] },
    });
    if (existing) rpcError(409, 'Tenant id or bundle id already exists');
    await this.prisma.tenant.create({
      data: {
        id: input.id,
        kind: input.kind,
        status: 'active',
        bundleId: input.bundleId,
        name: input.name,
        ticketPrefix: input.config.identifiers.ticket_prefix,
        residentIdPrefix: input.config.identifiers.resident_id_prefix,
      },
    });
    await this.prisma.tenantConfigVersion.create({
      data: { tenantId: input.id, version: 1, config: input.config as object },
    });
    return { id: input.id, version: 1 };
  }

  /** Config version history (metadata only) for the admin consoles. */
  async configHistory(tenantId: string) {
    const versions = await this.prisma.tenantConfigVersion.findMany({
      where: { tenantId },
      orderBy: { version: 'desc' },
      select: { version: true, createdAt: true },
      take: 50,
    });
    if (!versions.length) rpcError(404, `Unknown tenant: ${tenantId}`);
    return versions.map((v) => ({ version: v.version, created_at: v.createdAt.toISOString() }));
  }
}
