import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { OtpService } from './services/otp.service';
import { AuthService } from './services/auth.service';
import { ProfileService, ProfileUpdate } from './services/profile.service';
import { DigitalIdService } from './services/digital-id.service';

@Controller()
export class IdentityController {
  constructor(
    private readonly otp: OtpService,
    private readonly auth: AuthService,
    private readonly profile: ProfileService,
    private readonly digitalId: DigitalIdService,
  ) {}

  @MessagePattern({ cmd: 'identity.otp.request' })
  otpRequest(
    @Payload() p: TenantScoped<{ phone_number: string; ip?: string; sms_provider: string }>,
  ) {
    return this.otp.request(p.tenant, p.data.phone_number, p.data.ip, p.data.sms_provider);
  }

  @MessagePattern({ cmd: 'identity.otp.verify' })
  async otpVerify(
    @Payload() p: TenantScoped<{ phone_number: string; code: string; device_info?: string }>,
  ) {
    const phone = await this.otp.verify(p.tenant, p.data.phone_number, p.data.code);
    return this.auth.loginVerifiedPhone(p.tenant, phone, p.data.device_info);
  }

  @MessagePattern({ cmd: 'identity.auth.guest' })
  guest(@Payload() p: TenantScoped) {
    return this.auth.guest(p.tenant);
  }

  @MessagePattern({ cmd: 'identity.auth.refresh' })
  refresh(@Payload() p: TenantScoped<{ refresh_token: string }>) {
    return this.auth.refresh(p.tenant, p.data.refresh_token);
  }

  @MessagePattern({ cmd: 'identity.auth.logout' })
  logout(@Payload() p: TenantScoped<{ session_id: string }>) {
    return this.auth.logout(p.tenant, p.data.session_id);
  }

  @MessagePattern({ cmd: 'identity.profile.get' })
  profileGet(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.profile.get(p.tenant, p.data.user_id);
  }

  @MessagePattern({ cmd: 'identity.profile.update' })
  profileUpdate(@Payload() p: TenantScoped<{ user_id: string; update: ProfileUpdate }>) {
    return this.profile.update(p.tenant, p.data.user_id, p.data.update);
  }

  @MessagePattern({ cmd: 'identity.digitalid.get' })
  digitalIdGet(@Payload() p: TenantScoped<{ user_id: string }>) {
    return this.digitalId.get(p.tenant, p.data.user_id);
  }

  @MessagePattern({ cmd: 'identity.digitalid.verify' })
  digitalIdVerify(@Payload() p: { token: string }) {
    return this.digitalId.verify(p.token);
  }
}
