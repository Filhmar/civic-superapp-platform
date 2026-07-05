import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { AssistanceService } from './assistance.service';
import { RequestStatus } from './schemas/assistance.schema';

@Controller()
export class AssistanceController {
  constructor(private readonly assistance: AssistanceService) {}

  @MessagePattern({ cmd: 'assistance.programs.list' })
  listPrograms(@Payload() p: TenantScoped) {
    return this.assistance.listPrograms(p.tenant);
  }

  @MessagePattern({ cmd: 'assistance.request.create' })
  create(@Payload() p: TenantScoped<{ user_id: string; program_key: string; details: string }>) {
    return this.assistance.create(p.tenant, p.data.user_id, p.data.program_key, p.data.details);
  }

  @MessagePattern({ cmd: 'assistance.request.list' })
  listAll(@Payload() p: TenantScoped<{ status?: RequestStatus; limit?: number }>) {
    return this.assistance.listAll(p.tenant, p.data.status, p.data.limit);
  }

  @MessagePattern({ cmd: 'assistance.request.list-mine' })
  listMine(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.assistance.listMine(p.tenant, p.data.user_id);
  }

  @MessagePattern({ cmd: 'assistance.request.get' })
  get(@Payload() p: TenantScoped<{ user_id: string; request_id: string }>) {
    return this.assistance.get(p.tenant, p.data.user_id, p.data.request_id);
  }

  @MessagePattern({ cmd: 'assistance.request.transition' })
  transition(
    @Payload()
    p: TenantScoped<{
      request_id: string;
      to: RequestStatus;
      actor: string;
      note?: string;
      claim_schedule?: string;
      claim_location?: string;
      checklist?: { name: string; provided: boolean }[];
    }>,
  ) {
    return this.assistance.transition(
      p.tenant,
      p.data.request_id,
      p.data.to,
      p.data.actor,
      p.data.note,
      p.data.claim_schedule,
      p.data.claim_location,
      p.data.checklist,
    );
  }
}
