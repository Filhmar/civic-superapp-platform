import { Controller, Delete, ForbiddenException, Get, Inject, Param, Put, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { AuthUser, Public, ResidentOnly } from '../auth/auth.decorators';
import { RequiresModule } from '../tenant/module-flag.guard';

/**
 * One POI store serves the tourism grid (kind=tourism, modules.tourism),
 * the business directory (kind=business, modules.directory) and the home
 * nearby strip. Module gating is enforced per kind below.
 */
@Controller('places')
export class PlacesGatewayController {
  constructor(@Inject(SERVICE_CLIENT('places')) private readonly places: ClientProxy) {}

  @Public()
  @Get()
  async list(
    @Req() req: TenantRequest & { user?: AuthUser },
    @Query('kind') kind?: string,
    @Query('near') near?: string,
    @Query('limit') limit?: string,
  ) {
    // kind-level module gating: tourism grid vs directory are separate toggles.
    const moduleByKind: Record<string, 'tourism' | 'directory'> = {
      tourism: 'tourism',
      business: 'directory',
    };
    const required = kind ? moduleByKind[kind] : undefined;
    if (required && !req.tenant.modules[required]) {
      throw new ForbiddenException(`Module '${required}' is not enabled for this tenant`);
    }
    let nearPoint: { lat: number; lng: number } | undefined;
    if (near) {
      const [lat, lng] = near.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) nearPoint = { lat, lng };
    }
    return callService(this.places, 'places.list', {
      tenant: req.tenant,
      data: {
        kind,
        near: nearPoint,
        limit: limit ? Number(limit) : undefined,
        user_id: req.user?.scope === 'resident' ? req.user.userId : undefined,
      },
    });
  }

  @Public()
  @Get(':id')
  get(@Req() req: TenantRequest & { user?: AuthUser }, @Param('id') id: string) {
    return callService(this.places, 'places.get', {
      tenant: req.tenant,
      data: { id, user_id: req.user?.scope === 'resident' ? req.user.userId : undefined },
    });
  }

  @ResidentOnly()
  @Put(':id/favorite')
  favorite(@Req() req: TenantRequest & { user: AuthUser }, @Param('id') id: string) {
    return callService(this.places, 'places.favorite.set', {
      tenant: req.tenant,
      data: { user_id: req.user.userId, poi_id: id, value: true },
    });
  }

  @ResidentOnly()
  @Delete(':id/favorite')
  unfavorite(@Req() req: TenantRequest & { user: AuthUser }, @Param('id') id: string) {
    return callService(this.places, 'places.favorite.set', {
      tenant: req.tenant,
      data: { user_id: req.user.userId, poi_id: id, value: false },
    });
  }
}

@Controller('transport')
@RequiresModule('transport')
@Public()
export class TransportGatewayController {
  constructor(@Inject(SERVICE_CLIENT('places')) private readonly places: ClientProxy) {}

  @Get('routes')
  routes(@Req() req: TenantRequest) {
    return callService(this.places, 'transport.routes.list', { tenant: req.tenant, data: {} });
  }

  @Get('match')
  match(@Req() req: TenantRequest, @Query('from') from: string, @Query('to') to: string) {
    return callService(this.places, 'transport.routes.match', {
      tenant: req.tenant,
      data: { from: from ?? '', to: to ?? '' },
    });
  }
}
