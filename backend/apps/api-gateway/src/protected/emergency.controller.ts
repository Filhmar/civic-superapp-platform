import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsNumber, Max, Min } from 'class-validator';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { CurrentUser, AuthUser, Public } from '../auth/auth.decorators';
import { RequiresModule } from '../tenant/module-flag.guard';

export class SosLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

@Controller()
export class EmergencyGatewayController {
  constructor(@Inject(SERVICE_CLIENT('emergency')) private readonly emergency: ClientProxy) {}

  /** Hotlines are cached offline by the app and work for guests too. */
  @Public()
  @Get('hotlines')
  hotlines(@Req() req: TenantRequest, @Query('tag') tag?: string) {
    return callService(this.emergency, 'emergency.hotlines.list', {
      tenant: req.tenant,
      data: { tag },
    });
  }

  // SOS works for ANY authenticated session — guests included (emergencies
  // don't check paperwork). Requires a token, not a resident scope.
  @RequiresModule('sos')
  @Post('sos/sessions')
  open(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Body() dto: SosLocationDto) {
    return callService(this.emergency, 'emergency.sos.open', {
      tenant: req.tenant,
      data: { user_id: user.userId, lat: dto.lat, lng: dto.lng },
    });
  }

  @RequiresModule('sos')
  @Post('sos/sessions/:id/location')
  location(
    @Req() req: TenantRequest,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SosLocationDto,
  ) {
    return callService(this.emergency, 'emergency.sos.location', {
      tenant: req.tenant,
      data: { user_id: user.userId, session_id: id, lat: dto.lat, lng: dto.lng },
    });
  }

  @RequiresModule('sos')
  @Post('sos/sessions/:id/close')
  close(@Req() req: TenantRequest, @CurrentUser() user: AuthUser, @Param('id') id: string) {
    return callService(this.emergency, 'emergency.sos.close', {
      tenant: req.tenant,
      data: { user_id: user.userId, session_id: id },
    });
  }
}
