import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { POST_CATEGORIES } from '@app/common';
import { Public } from '../auth/auth.decorators';
import { RequiresModule } from '../tenant/module-flag.guard';

export class PostListQueryDto {
  @IsOptional()
  @IsIn(POST_CATEGORIES as unknown as string[])
  category?: string;

  @IsOptional()
  @IsBooleanString()
  pinned?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

@Controller('posts')
@Public()
@RequiresModule('news')
export class PostsController {
  constructor(@Inject(SERVICE_CLIENT('content')) private readonly content: ClientProxy) {}

  @Get()
  list(@Req() req: TenantRequest, @Query() q: PostListQueryDto) {
    return callService(this.content, 'content.posts.list', {
      tenant: req.tenant,
      data: {
        category: q.category,
        pinned: q.pinned === undefined ? undefined : q.pinned === 'true',
        unit: q.unit,
        before: q.before,
        limit: q.limit ? Number(q.limit) : undefined,
      },
    });
  }

  @Get(':id')
  get(@Req() req: TenantRequest, @Param('id') id: string) {
    return callService(this.content, 'content.posts.get', {
      tenant: req.tenant,
      data: { id },
    });
  }
}
