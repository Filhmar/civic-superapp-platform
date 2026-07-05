import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';

/**
 * Public QR verify (Reference §2/§5.1): no X-Tenant-ID header — the tenant
 * travels inside the signed payload. Returns only name/unit/verified/validity.
 */
@Controller('verify')
export class VerifyController {
  constructor(@Inject(SERVICE_CLIENT('identity')) private readonly identity: ClientProxy) {}

  @Public()
  @Get(':token')
  verify(@Param('token') token: string) {
    return callService(this.identity, 'identity.digitalid.verify', { token });
  }
}
