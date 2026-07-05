import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { MediaService } from './media.service';
import { MediaKind } from './schemas/media.schema';

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @MessagePattern({ cmd: 'media.presign' })
  presign(@Payload() p: TenantScoped<{ user_id: string; content_type: string; kind: MediaKind }>) {
    return this.media.presign(p.tenant, p.data.user_id, p.data.content_type, p.data.kind);
  }

  @MessagePattern({ cmd: 'media.confirm' })
  confirm(@Payload() p: TenantScoped<{ user_id: string; media_id: string }>) {
    return this.media.confirm(p.tenant, p.data.user_id, p.data.media_id);
  }
}
