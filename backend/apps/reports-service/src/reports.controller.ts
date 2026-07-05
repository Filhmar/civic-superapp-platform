import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { CreateTicketInput, ReportsService } from './reports.service';
import { TicketStatus } from './schemas/ticket.schema';

@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @MessagePattern({ cmd: 'reports.categories.list' })
  listCategories(@Payload() p: TenantScoped) {
    return this.reports.listCategories(p.tenant);
  }

  @MessagePattern({ cmd: 'reports.ticket.create' })
  create(@Payload() p: TenantScoped<CreateTicketInput>) {
    return this.reports.create(p.tenant, p.data);
  }

  @MessagePattern({ cmd: 'reports.ticket.list-mine' })
  listMine(@Payload() p: TenantScoped<{ user_id: string; limit?: number }>) {
    return this.reports.listMine(p.tenant, p.data.user_id, p.data.limit);
  }

  @MessagePattern({ cmd: 'reports.ticket.get' })
  get(@Payload() p: TenantScoped<{ user_id: string; ticket_id: string }>) {
    return this.reports.get(p.tenant, p.data.user_id, p.data.ticket_id);
  }

  @MessagePattern({ cmd: 'reports.ticket.transition' })
  transition(
    @Payload()
    p: TenantScoped<{ ticket_id: string; to: TicketStatus; actor: string; note?: string }>,
  ) {
    return this.reports.transition(p.tenant, p.data.ticket_id, p.data.to, p.data.actor, p.data.note);
  }
}
