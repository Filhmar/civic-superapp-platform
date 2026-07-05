import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantConfig } from '@app/common';
import { TenancyService } from './services/tenancy.service';

@Controller()
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  @MessagePattern({ cmd: 'tenancy.resolve' })
  resolve(@Payload() payload: { key: string }) {
    return this.tenancy.resolve(payload.key);
  }

  @MessagePattern({ cmd: 'config.get' })
  getConfig(@Payload() payload: { tenantId: string }) {
    return this.tenancy.getConfig(payload.tenantId);
  }

  @MessagePattern({ cmd: 'config.upsert' })
  upsertConfig(@Payload() payload: { tenantId: string; config: TenantConfig }) {
    return this.tenancy.upsertConfig(payload.tenantId, payload.config);
  }

  @MessagePattern({ cmd: 'tenancy.list' })
  list() {
    return this.tenancy.list();
  }
}
