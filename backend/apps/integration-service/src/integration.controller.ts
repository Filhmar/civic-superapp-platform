import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantScoped } from '@app/common';
import { WeatherService } from './weather.service';

@Controller()
export class IntegrationController {
  constructor(private readonly weather: WeatherService) {}

  @MessagePattern({ cmd: 'integration.weather.get' })
  getWeather(
    @Payload() p: TenantScoped<{ centroid: [number, number]; provider: string }>,
  ) {
    return this.weather.get(p.tenant.tenantId, p.data.centroid, p.data.provider);
  }
}
