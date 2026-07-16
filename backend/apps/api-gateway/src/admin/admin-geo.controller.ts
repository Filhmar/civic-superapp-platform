import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { TenantContext } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';
import { AdminJwtGuard, resolveTenantScope } from './admin-jwt.guard';
import { AdminPrincipal, CurrentAdmin } from './admin.decorators';

export class GeoImportDto {
  @IsArray()
  features!: {
    layer: string;
    name: string;
    refId?: string;
    properties?: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  replace_layers?: string[];
}

/**
 * Tenant-boundary & gazetteer management (M10). Tenant admins upload their city's
 * own GeoJSON (boundary, barangays, facilities); scope is enforced server-side so
 * a tenant admin can only touch their own geometry.
 */
@Controller('admin/tenants/:tenantId/geo')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminGeoController {
  constructor(
    @Inject(SERVICE_CLIENT('geo')) private readonly geo: ClientProxy,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
  ) {}

  private ctx(admin: AdminPrincipal, tenantId: string): Promise<TenantContext> {
    const scope = resolveTenantScope(admin, tenantId);
    return callService<TenantContext>(this.tenancy, 'tenancy.resolve', { key: scope });
  }

  @Post('import')
  async import(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('tenantId') tenantId: string,
    @Body() dto: GeoImportDto,
  ) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.geo, 'geo.import', {
      tenant,
      data: { features: dto.features, replace_layers: dto.replace_layers ?? [] },
    });
  }

  @Get('boundary')
  async boundary(@CurrentAdmin() admin: AdminPrincipal, @Param('tenantId') tenantId: string) {
    const tenant = await this.ctx(admin, tenantId);
    return callService(this.geo, 'geo.boundary', { tenant, data: {} });
  }
}
