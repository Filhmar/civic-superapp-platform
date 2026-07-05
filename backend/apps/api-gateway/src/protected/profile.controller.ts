import { BadRequestException, Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TenantConfig } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, ResidentOnly } from '../auth/auth.decorators';

export class ProfileUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string;

  @IsOptional()
  @IsIn(['en', 'fil'])
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar_url?: string;
}

@Controller('profile')
@ResidentOnly()
export class ProfileController {
  constructor(
    @Inject(SERVICE_CLIENT('identity')) private readonly identity: ClientProxy,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
  ) {}

  @Get()
  get(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.identity, 'identity.profile.get', {
      tenant: req.tenant,
      data: { user_id: user.userId },
    });
  }

  @Patch()
  async update(
    @Req() req: TenantRequest,
    @CurrentUser() user: AuthUser,
    @Body() dto: ProfileUpdateDto,
  ) {
    if (dto.unit !== undefined) {
      // Barangay list is tenant config data — validate against it, not a code list.
      const { config } = await callService<{ config: TenantConfig }>(
        this.tenancy,
        'config.get',
        { tenantId: req.tenant.tenantId },
      );
      if (!config.geo.units.includes(dto.unit)) {
        throw new BadRequestException(`Unknown barangay/unit: ${dto.unit}`);
      }
    }
    return callService(this.identity, 'identity.profile.update', {
      tenant: req.tenant,
      data: {
        user_id: user.userId,
        update: {
          name: dto.name,
          unit: dto.unit,
          language: dto.language,
          avatarUrl: dto.avatar_url,
        },
      },
    });
  }
}
