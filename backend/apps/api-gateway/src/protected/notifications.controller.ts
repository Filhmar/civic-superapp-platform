import { Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, ResidentOnly } from '../auth/auth.decorators';

@Controller('notifications')
@ResidentOnly()
export class NotificationsController {
  constructor(
    @Inject(SERVICE_CLIENT('notification')) private readonly notifications: ClientProxy,
  ) {}

  @Get()
  list(
    @Req() req: TenantRequest,
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return callService(this.notifications, 'notifications.list', {
      tenant: req.tenant,
      data: { user_id: user.userId, limit: limit ? Number(limit) : undefined, before },
    });
  }

  @Get('unread-count')
  unreadCount(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.notifications, 'notifications.unread-count', {
      tenant: req.tenant,
      data: { user_id: user.userId },
    });
  }

  @Post(':id/read')
  markRead(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Param('id') id: string) {
    return callService(this.notifications, 'notifications.mark-read', {
      tenant: req.tenant,
      data: { user_id: user.userId, id },
    });
  }

  @Post('read-all')
  markAllRead(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.notifications, 'notifications.mark-all-read', {
      tenant: req.tenant,
      data: { user_id: user.userId },
    });
  }
}
