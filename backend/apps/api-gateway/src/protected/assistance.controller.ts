import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, Public, ResidentOnly } from '../auth/auth.decorators';
import { RequiresModule } from '../tenant/module-flag.guard';

export class CreateAssistanceRequestDto {
  @IsString()
  @IsNotEmpty()
  program_key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  details!: string;
}

@Controller('assistance')
@RequiresModule('assistance')
export class AssistanceGatewayController {
  constructor(@Inject(SERVICE_CLIENT('assistance')) private readonly assistance: ClientProxy) {}

  @Public()
  @Get('programs')
  programs(@Req() req: TenantRequest) {
    return callService(this.assistance, 'assistance.programs.list', {
      tenant: req.tenant,
      data: {},
    });
  }

  @ResidentOnly()
  @Post('requests')
  create(
    @Req() req: TenantRequest,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssistanceRequestDto,
  ) {
    return callService(this.assistance, 'assistance.request.create', {
      tenant: req.tenant,
      data: { user_id: user.userId, program_key: dto.program_key, details: dto.details },
    });
  }

  @ResidentOnly()
  @Get('requests')
  listMine(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.assistance, 'assistance.request.list-mine', {
      tenant: req.tenant,
      data: { user_id: user.userId },
    });
  }

  @ResidentOnly()
  @Get('requests/:requestId')
  get(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return callService(this.assistance, 'assistance.request.get', {
      tenant: req.tenant,
      data: { user_id: user.userId, request_id: requestId },
    });
  }
}
