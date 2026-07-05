import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { ApplicationStatus, EgovService } from './egov.service';

@Controller()
export class EgovController {
  constructor(private readonly egov: EgovService) {}

  @MessagePattern({ cmd: 'egov.catalog.list' })
  catalog(@Payload() p: TenantScoped) {
    return this.egov.catalog(p.tenant);
  }

  @MessagePattern({ cmd: 'egov.application.create' })
  create(
    @Payload()
    p: TenantScoped<{ user_id: string; service_code: string; form_data: Record<string, unknown> }>,
  ) {
    return this.egov.createApplication(p.tenant, p.data.user_id, p.data.service_code, p.data.form_data);
  }

  @MessagePattern({ cmd: 'egov.payment.create' })
  pay(
    @Payload()
    p: TenantScoped<{
      user_id: string;
      application_id: string;
      method: string;
      idempotency_key: string;
      allowed_methods: string[];
    }>,
  ) {
    return this.egov.pay(
      p.tenant,
      p.data.user_id,
      p.data.application_id,
      p.data.method,
      p.data.idempotency_key,
      p.data.allowed_methods,
    );
  }

  @MessagePattern({ cmd: 'egov.application.list-mine' })
  listMine(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.egov.listMine(p.tenant, p.data.user_id);
  }

  @MessagePattern({ cmd: 'egov.application.get' })
  get(@Payload() p: TenantScoped<{ user_id: string; stub_id: string }>) {
    return this.egov.get(p.tenant, p.data.user_id, p.data.stub_id);
  }

  @MessagePattern({ cmd: 'egov.application.transition' })
  transition(
    @Payload()
    p: TenantScoped<{ stub_id: string; to: ApplicationStatus; actor: string; note?: string }>,
  ) {
    return this.egov.transition(p.tenant, p.data.stub_id, p.data.to, p.data.actor, p.data.note);
  }
}
