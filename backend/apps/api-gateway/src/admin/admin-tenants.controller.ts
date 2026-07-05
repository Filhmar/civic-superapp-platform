import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn, IsNotEmpty, IsObject, IsString, Matches } from 'class-validator';
import {
  MODULE_NAMES,
  ModuleName,
  TenantConfig,
  tenantConfigSchema,
} from '@app/common';
import { RedisService } from '@app/redis';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';
import { AdminJwtGuard, resolveTenantScope } from './admin-jwt.guard';
import { AdminPrincipal, CurrentAdmin, PlatformOnly } from './admin.decorators';

export class CreateTenantDto {
  @Matches(/^[a-z0-9-]+$/)
  id!: string;

  @IsIn(['city', 'municipality', 'province', 'region'])
  kind!: string;

  @Matches(/^[a-z0-9.]+$/)
  bundle_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  config!: Record<string, unknown>;
}

export class BrandingPatchDto {
  @IsObject()
  branding!: Record<string, unknown>;
}

export class ModulesPatchDto {
  @IsObject()
  modules!: Partial<Record<ModuleName, boolean>>;
}

export class ConfigPutDto {
  @IsObject()
  config!: Record<string, unknown>;
}

@Controller('admin/tenants')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminTenantsController {
  constructor(
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async list(@CurrentAdmin() admin: AdminPrincipal) {
    const all = await callService<{ id: string }[]>(this.tenancy, 'tenancy.list', {});
    return admin.role === 'platform_admin' ? all : all.filter((t) => t.id === admin.tenantId);
  }

  @PlatformOnly()
  @Post()
  async create(@Body() dto: CreateTenantDto) {
    const parsed = tenantConfigSchema.safeParse({ ...dto.config, tenant_id: dto.id });
    if (!parsed.success) {
      throw new BadRequestException(`Invalid tenant config: ${parsed.error.message}`);
    }
    return callService(this.tenancy, 'tenancy.tenant.create', {
      id: dto.id,
      kind: dto.kind,
      bundleId: dto.bundle_id,
      name: dto.name,
      config: parsed.data,
    });
  }

  @Get(':tenantId/config')
  getConfig(@CurrentAdmin() admin: AdminPrincipal, @Param('tenantId') tenantId: string) {
    const scope = resolveTenantScope(admin, tenantId);
    return callService(this.tenancy, 'config.get', { tenantId: scope });
  }

  @Get(':tenantId/config/history')
  history(@CurrentAdmin() admin: AdminPrincipal, @Param('tenantId') tenantId: string) {
    const scope = resolveTenantScope(admin, tenantId);
    return callService(this.tenancy, 'config.history', { tenantId: scope });
  }

  /** Full config replace → new version. Validated against the §3 contract. */
  @Put(':tenantId/config')
  async putConfig(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Body() dto: ConfigPutDto,
  ) {
    const scope = resolveTenantScope(admin, tenantId);
    if (admin.role !== 'platform_admin') {
      // Tenant admins use the scoped branding/content endpoints; whole-config
      // replace (prefixes, modules, integrations) stays a platform operation.
      const current = await this.currentConfig(scope);
      const next = dto.config as unknown as TenantConfig;
      const guarded: (keyof TenantConfig)[] = ['identifiers', 'modules', 'integrations'];
      for (const key of guarded) {
        if (JSON.stringify(next[key]) !== JSON.stringify(current[key])) {
          throw new BadRequestException(`Field '${key}' can only be changed by the platform`);
        }
      }
    }
    return this.appendVersion(scope, dto.config);
  }

  /** Branding-only merge (the tenant-admin “SaaS” surface: colors, slogan,
   *  executive, logo assets, onboarding, home flags, app name/tagline). */
  @Patch(':tenantId/config/branding')
  async patchBranding(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Body() dto: BrandingPatchDto,
  ) {
    const scope = resolveTenantScope(admin, tenantId);
    const current = await this.currentConfig(scope);
    const b = dto.branding as Partial<TenantConfig> & { brand?: Partial<TenantConfig['brand']> };
    const merged: TenantConfig = {
      ...current,
      app: { ...current.app, ...(b.app ?? {}) },
      brand: {
        ...current.brand,
        ...(b.brand ?? {}),
        colors: { ...current.brand.colors, ...(b.brand?.colors ?? {}) },
        logo: {
          ...current.brand.logo,
          ...(b.brand?.logo ?? {}),
          assets: { ...current.brand.logo.assets, ...(b.brand?.logo?.assets ?? {}) },
        },
        executive: { ...current.brand.executive, ...(b.brand?.executive ?? {}) },
      },
      onboarding: (b.onboarding as TenantConfig['onboarding']) ?? current.onboarding,
      home: { ...current.home, ...(b.home ?? {}) },
    };
    return this.appendVersion(scope, merged as unknown as Record<string, unknown>);
  }

  /** Module toggles = billing-tier enforcement → platform only. */
  @PlatformOnly()
  @Patch(':tenantId/config/modules')
  async patchModules(@Param('tenantId') tenantId: string, @Body() dto: ModulesPatchDto) {
    for (const key of Object.keys(dto.modules)) {
      if (!MODULE_NAMES.includes(key as ModuleName)) {
        throw new BadRequestException(`Unknown module: ${key}`);
      }
    }
    const current = await this.currentConfig(tenantId);
    const merged = { ...current, modules: { ...current.modules, ...dto.modules } };
    return this.appendVersion(tenantId, merged as unknown as Record<string, unknown>);
  }

  private async currentConfig(tenantId: string): Promise<TenantConfig> {
    const { config } = await callService<{ config: TenantConfig }>(this.tenancy, 'config.get', {
      tenantId,
    });
    return config;
  }

  private async appendVersion(tenantId: string, config: Record<string, unknown>) {
    const parsed = tenantConfigSchema.safeParse({ ...config, tenant_id: tenantId });
    if (!parsed.success) {
      throw new BadRequestException(`Invalid tenant config: ${parsed.error.message}`);
    }
    const result = await callService<{ version: number }>(this.tenancy, 'config.upsert', {
      tenantId,
      config: parsed.data,
    });
    // Bust the gateway's tenant-context cache so flags/prefixes apply now.
    const keys = await this.redis.client.keys('tenant:ctx:*').catch(() => []);
    if (keys.length) await this.redis.client.del(...keys).catch(() => undefined);
    return result;
  }
}
