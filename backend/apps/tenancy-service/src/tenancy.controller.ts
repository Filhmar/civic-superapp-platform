import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantConfig, TenantKind } from '@app/common';
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

  @MessagePattern({ cmd: 'tenancy.tenant.create' })
  createTenant(
    @Payload()
    payload: { id: string; kind: TenantKind; bundleId: string; name: string; config: TenantConfig },
  ) {
    return this.tenancy.createTenant(payload);
  }

  @MessagePattern({ cmd: 'config.history' })
  configHistory(@Payload() payload: { tenantId: string }) {
    return this.tenancy.configHistory(payload.tenantId);
  }
}
