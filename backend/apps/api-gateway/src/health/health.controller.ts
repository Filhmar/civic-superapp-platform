import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RedisService } from '@app/redis';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancyClient: ClientProxy,
  ) {}

  @Get()
  async health() {
    const [redisOk, tenancyOk] = await Promise.all([
      this.redis.client
        .ping()
        .then(() => true)
        .catch(() => false),
      callService(this.tenancyClient, 'tenancy.list', {})
        .then(() => true)
        .catch(() => false),
    ]);
    return { status: redisOk && tenancyOk ? 'ok' : 'degraded', redis: redisOk, tenancy: tenancyOk };
  }
}
