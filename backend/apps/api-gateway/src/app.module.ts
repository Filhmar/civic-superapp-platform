import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { ClientsModule } from './clients/clients.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { ModuleFlagGuard } from './tenant/module-flag.guard';
import { ConfigController } from './public/config.controller';
import { HealthController } from './health/health.controller';
import { AuthController } from './auth/auth.controller';
import { JwtGuard } from './auth/jwt.guard';
import { ProfileController } from './protected/profile.controller';
import { DigitalIdController } from './protected/digital-id.controller';
import { VerifyController } from './public/verify.controller';
import { PostsController } from './public/posts.controller';
import { ContentMiscController } from './public/content-misc.controller';
import { NotificationsController } from './protected/notifications.controller';
import { WeatherController } from './public/weather.controller';
import { ReportsGatewayController } from './protected/reports.controller';
import { MediaGatewayController } from './protected/media.controller';
import { EgovGatewayController } from './protected/egov.controller';
import { AssistanceGatewayController } from './protected/assistance.controller';
import { EmergencyGatewayController } from './protected/emergency.controller';
import { SosGateway } from './gateways/sos.gateway';
import { PlacesGatewayController, TransportGatewayController } from './public/places.controller';
import { SearchGatewayController } from './public/search.controller';

@Module({
  imports: [
    AppConfigModule,
    RedisModule,
    ClientsModule,
    JwtModule.register({}),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 60000, limit: 300 },
    ]),
  ],
  controllers: [
    ConfigController,
    HealthController,
    AuthController,
    ProfileController,
    DigitalIdController,
    VerifyController,
    PostsController,
    ContentMiscController,
    NotificationsController,
    WeatherController,
    ReportsGatewayController,
    MediaGatewayController,
    EgovGatewayController,
    AssistanceGatewayController,
    EmergencyGatewayController,
    PlacesGatewayController,
    TransportGatewayController,
    SearchGatewayController,
  ],
  providers: [
    SosGateway,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: ModuleFlagGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Tenant resolution guards every route except health and the public QR verify.
    consumer
      .apply(TenantMiddleware)
      .exclude('health', 'health/(.*)', 'verify', 'verify/(.*)')
      .forRoutes('*');
  }
}
