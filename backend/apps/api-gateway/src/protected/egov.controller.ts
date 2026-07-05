import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { TenantConfig } from '@app/common';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, Public, ResidentOnly } from '../auth/auth.decorators';
import { RequiresModule } from '../tenant/module-flag.guard';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  service_code!: string;

  @IsObject()
  form_data!: Record<string, unknown>;
}

export class CreatePaymentDto {
  @IsUUID()
  application_id!: string;

  @IsIn(['gcash', 'card'])
  method!: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

@Controller()
@RequiresModule('egov')
export class EgovGatewayController {
  constructor(
    @Inject(SERVICE_CLIENT('egov')) private readonly egov: ClientProxy,
    @Inject(SERVICE_CLIENT('tenancy')) private readonly tenancy: ClientProxy,
  ) {}

  @Public()
  @Get('services')
  catalog(@Req() req: TenantRequest) {
    return callService(this.egov, 'egov.catalog.list', { tenant: req.tenant, data: {} });
  }

  @ResidentOnly()
  @Post('applications')
  create(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Body() dto: CreateApplicationDto) {
    return callService(this.egov, 'egov.application.create', {
      tenant: req.tenant,
      data: { user_id: user.userId, service_code: dto.service_code, form_data: dto.form_data },
    });
  }

  @ResidentOnly()
  @Post('payments')
  async pay(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    // Which payment rails a tenant offers is config data.
    const { config } = await callService<{ config: TenantConfig }>(this.tenancy, 'config.get', {
      tenantId: req.tenant.tenantId,
    });
    const idempotencyKey =
      dto.idempotency_key ?? `auto-${user.userId}-${dto.application_id}-${dto.method}`;
    return callService(this.egov, 'egov.payment.create', {
      tenant: req.tenant,
      data: {
        user_id: user.userId,
        application_id: dto.application_id,
        method: dto.method,
        idempotency_key: idempotencyKey,
        allowed_methods: config.integrations.payments,
      },
    });
  }

  @ResidentOnly()
  @Get('applications')
  listMine(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.egov, 'egov.application.list-mine', {
      tenant: req.tenant,
      data: { user_id: user.userId },
    });
  }

  @ResidentOnly()
  @Get('applications/:stubId')
  get(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Param('stubId') stubId: string) {
    return callService(this.egov, 'egov.application.get', {
      tenant: req.tenant,
      data: { user_id: user.userId, stub_id: stubId },
    });
  }
}
