import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { IntegrationController } from './integration.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [AppConfigModule, RedisModule],
  controllers: [IntegrationController],
  providers: [WeatherService],
})
export class IntegrationModule {}
