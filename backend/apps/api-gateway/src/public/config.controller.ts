import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppConfigService, TenantConfig } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';

/**
 * The app boots entirely from this response (Reference §3): brand, onboarding,
 * home flags, module grid — plus the force-update minimum version.
 */
@Controller('config')
export class ConfigController {
  constructor(
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancyClient: ClientProxy,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get()
  async getConfig(@Req() req: TenantRequest) {
    const result = await callService<{ version: number; config: TenantConfig }>(
      this.tenancyClient,
      'config.get',
      { tenantId: req.tenant.tenantId },
    );
    return {
      ...result,
      app_min_supported_version: this.appConfig.get('APP_MIN_SUPPORTED_VERSION'),
    };
  }
}
