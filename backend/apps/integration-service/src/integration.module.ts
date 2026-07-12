import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { IntegrationController } from './integration.controller';
import { WeatherService } from './weather.service';
import { UsappDriver } from './usapp/usapp.driver';

@Module({
  imports: [AppConfigModule, RedisModule],
  controllers: [IntegrationController],
  providers: [WeatherService, UsappDriver],
})
export class IntegrationModule {}
