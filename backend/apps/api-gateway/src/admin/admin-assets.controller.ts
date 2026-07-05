import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn, IsString } from 'class-validator';
import { TenantContext } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { Public } from '../auth/auth.decorators';
import { AdminJwtGuard, resolveTenantScope } from './admin-jwt.guard';
import { AdminPrincipal, CurrentAdmin } from './admin.decorators';

export class AdminPresignDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
  content_type!: string;

  @IsIn(['brand', 'cms', 'poi'])
  kind!: string;

  @IsString()
  tenant_id!: string;
}

export class AdminConfirmDto {
  @IsString()
  tenant_id!: string;
}

/**
 * Brand-kit intake (Reference §4 step 2): admins upload seals, mascots, mayor
 * photos and onboarding art straight into MinIO/S3; the returned public URL is
 * then written into the tenant config so every client renders it — no code.
 */
@Controller('admin/assets')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminAssetsController {
  constructor(
    @Inject(SERVICE_CLIENT('media')) private readonly media: ClientProxy,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
  ) {}

  @Post('presign')
  async presign(@CurrentAdmin() admin: AdminPrincipal, @Body() dto: AdminPresignDto) {
    const scope = resolveTenantScope(admin, dto.tenant_id);
    const tenant = await callService<TenantContext>(this.tenancy, 'tenancy.resolve', {
      key: scope,
    });
    return callService(this.media, 'media.presign', {
      tenant,
      data: {
        user_id: `admin:${admin.adminId}`,
        content_type: dto.content_type,
        kind: dto.kind,
      },
    });
  }

  @Post(':id/confirm')
  async confirm(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string,
    @Body() dto: AdminConfirmDto,
  ) {
    const scope = resolveTenantScope(admin, dto.tenant_id);
    const tenant = await callService<TenantContext>(this.tenancy, 'tenancy.resolve', {
      key: scope,
    });
    return callService(this.media, 'media.confirm', {
      tenant,
      data: { user_id: `admin:${admin.adminId}`, media_id: id },
    });
  }
}
