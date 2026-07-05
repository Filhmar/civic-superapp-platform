import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TenantConfig } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { Public } from '../auth/auth.decorators';

@Controller('weather')
@Public()
export class WeatherController {
  constructor(
    @Inject(SERVICE_CLIENT('integration')) private readonly integration: ClientProxy,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
  ) {}

  @Get()
  async get(@Req() req: TenantRequest) {
    // Centroid + provider are tenant config data.
    const { config } = await callService<{ config: TenantConfig }>(this.tenancy, 'config.get', {
      tenantId: req.tenant.tenantId,
    });
    return callService(this.integration, 'integration.weather.get', {
      tenant: req.tenant,
      data: { centroid: config.geo.centroid, provider: config.integrations.weather },
    });
  }
}
