import { Body, Controller, Inject, Param, Post, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn } from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, ResidentOnly } from '../auth/auth.decorators';

export class PresignDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  content_type!: string;

  @IsIn(['report', 'avatar', 'cms', 'poi'])
  kind!: string;
}

@Controller('media')
@ResidentOnly()
export class MediaGatewayController {
  constructor(@Inject(SERVICE_CLIENT('media')) private readonly media: ClientProxy) {}

  @Post('presign')
  presign(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Body() dto: PresignDto) {
    return callService(this.media, 'media.presign', {
      tenant: req.tenant,
      data: { user_id: user.userId, content_type: dto.content_type, kind: dto.kind },
    });
  }

  @Post(':id/confirm')
  confirm(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Param('id') id: string) {
    return callService(this.media, 'media.confirm', {
      tenant: req.tenant,
      data: { user_id: user.userId, media_id: id },
    });
  }
}
