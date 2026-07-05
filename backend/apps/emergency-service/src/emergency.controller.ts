import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { EmergencyService } from './emergency.service';

@Controller()
export class EmergencyController {
  constructor(private readonly emergency: EmergencyService) {}

  @MessagePattern({ cmd: 'emergency.hotlines.list' })
  hotlines(@Payload() p: TenantScoped<{ tag?: string }>) {
    return this.emergency.listHotlines(p.tenant, p.data.tag);
  }

  @MessagePattern({ cmd: 'emergency.sos.open' })
  open(@Payload() p: TenantScoped<{ user_id: string; lat: number; lng: number }>) {
    return this.emergency.openSos(p.tenant, p.data.user_id, p.data.lat, p.data.lng);
  }

  @MessagePattern({ cmd: 'emergency.sos.location' })
  location(
    @Payload() p: TenantScoped<{ user_id: string; session_id: string; lat: number; lng: number }>,
  ) {
    return this.emergency.pushLocation(
      p.tenant,
      p.data.user_id,
      p.data.session_id,
      p.data.lat,
      p.data.lng,
    );
  }

  @MessagePattern({ cmd: 'emergency.sos.close' })
  close(@Payload() p: TenantScoped<{ user_id: string; session_id: string }>) {
    return this.emergency.closeSos(p.tenant, p.data.user_id, p.data.session_id);
  }

  @MessagePattern({ cmd: 'emergency.sos.get' })
  get(@Payload() p: TenantScoped<{ session_id: string }>) {
    return this.emergency.getSos(p.tenant, p.data.session_id);
  }
}
