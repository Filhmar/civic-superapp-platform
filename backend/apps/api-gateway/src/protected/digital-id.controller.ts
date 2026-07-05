import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, ResidentOnly } from '../auth/auth.decorators';

@Controller('digital-id')
@ResidentOnly()
export class DigitalIdController {
  constructor(@Inject(SERVICE_CLIENT('identity')) private readonly identity: ClientProxy) {}

  @Get()
  get(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.identity, 'identity.digitalid.get', {
      tenant: req.tenant,
      data: { user_id: user.userId },
    });
  }
}
