import { Body, Controller, Inject, Ip, Post, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { SERVICE_CLIENT } from '../clients/clients.module';
import { callService } from '../clients/call-service';
import { TenantRequest } from '../tenant/tenant.types';
import { Public, CurrentUser, AuthUser } from './auth.decorators';

export class OtpRequestDto {
  @Matches(/^\+639\d{9}$/, { message: 'phone_number must be +639XXXXXXXXX' })
  phone_number!: string;
}

export class OtpVerifyDto {
  @Matches(/^\+639\d{9}$/, { message: 'phone_number must be +639XXXXXXXXX' })
  phone_number!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

@Controller()
export class AuthController {
  constructor(
    @Inject(SERVICE_CLIENT('identity')) private readonly identity: ClientProxy,
  ) {}

  @Public()
  @Throttle({ short: { ttl: 60000, limit: 6 } })
  @Post('otp/request')
  otpRequest(@Req() req: TenantRequest, @Body() dto: OtpRequestDto, @Ip() ip: string) {
    return callService(this.identity, 'identity.otp.request', {
      tenant: req.tenant,
      data: {
        phone_number: dto.phone_number,
        ip,
        // Which SMS aggregator to use is tenant config data.
        sms_provider: 'mock',
      },
    });
  }

  @Public()
  @Post('otp/verify')
  otpVerify(@Req() req: TenantRequest, @Body() dto: OtpVerifyDto) {
    return callService(this.identity, 'identity.otp.verify', {
      tenant: req.tenant,
      data: {
        phone_number: dto.phone_number,
        code: dto.code,
        device_info: req.headers['user-agent'],
      },
    });
  }

  @Public()
  @Post('auth/guest')
  guest(@Req() req: TenantRequest) {
    return callService(this.identity, 'identity.auth.guest', { tenant: req.tenant, data: {} });
  }

  @Public()
  @Post('auth/refresh')
  refresh(@Req() req: TenantRequest, @Body() dto: RefreshDto) {
    return callService(this.identity, 'identity.auth.refresh', {
      tenant: req.tenant,
      data: { refresh_token: dto.refresh_token },
    });
  }

  @Post('auth/logout')
  logout(@Req() req: TenantRequest, @CurrentUser() user: AuthUser) {
    return callService(this.identity, 'identity.auth.logout', {
      tenant: req.tenant,
      data: { session_id: user.sessionId },
    });
  }
}
