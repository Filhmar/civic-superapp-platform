import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @MessagePattern({ cmd: 'notifications.list' })
  list(@Payload() p: TenantScoped<{ user_id: string; limit?: number; before?: string }>) {
    return this.notifications.list(p.tenant, p.data.user_id, p.data.limit, p.data.before);
  }

  @MessagePattern({ cmd: 'notifications.unread-count' })
  unreadCount(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.notifications.unreadCount(p.tenant, p.data.user_id);
  }

  @MessagePattern({ cmd: 'notifications.mark-read' })
  markRead(@Payload() p: TenantScoped<{ user_id: string; id: string }>) {
    return this.notifications.markRead(p.tenant, p.data.user_id, p.data.id);
  }

  @MessagePattern({ cmd: 'notifications.mark-all-read' })
  markAllRead(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.notifications.markAllRead(p.tenant, p.data.user_id);
  }

  @MessagePattern({ cmd: 'notifications.create' })
  create(
    @Payload()
    p: TenantScoped<{
      user_id: string;
      title: string;
      body: string;
      category: string;
      data?: Record<string, unknown>;
    }>,
  ) {
    return this.notifications.create(
      p.tenant,
      p.data.user_id,
      p.data.title,
      p.data.body,
      p.data.category,
      p.data.data,
    );
  }
}
