import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped, rpcError } from '@app/common';
import { WeatherService } from './weather.service';
import { UsappDriver } from './usapp/usapp.driver';
import {
  DeliveryRateLimitedError,
  RecipientNotRegisteredError,
} from './usapp/usapp.errors';

@Controller()
export class IntegrationController {
  constructor(
    private readonly weather: WeatherService,
    private readonly usapp: UsappDriver,
  ) {}

  @MessagePattern({ cmd: 'integration.weather.get' })
  getWeather(@Payload() p: TenantScoped<{ centroid: [number, number]; provider: string }>) {
    return this.weather.get(p.tenant.tenantId, p.data.centroid, p.data.provider);
  }

  // Platform-level (single Usapp tenant): not TenantScoped. Callers pass the
  // already-composed message; the driver never sees business context.
  @MessagePattern({ cmd: 'integration.usapp.send' })
  async usappSend(@Payload() p: { phone: string; content: string }) {
    try {
      await this.usapp.send(p.phone, p.content);
      return { delivered: true };
    } catch (e) {
      if (e instanceof RecipientNotRegisteredError) rpcError(409, 'Recipient is not registered on Usapp');
      if (e instanceof DeliveryRateLimitedError) rpcError(503, 'Usapp is rate limiting delivery');
      rpcError(502, 'Usapp delivery unavailable');
    }
  }
}
