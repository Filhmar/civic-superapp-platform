import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '@app/common';
import { RedisModule } from '@app/redis';
import { ClientsModule } from './clients/clients.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { ModuleFlagGuard } from './tenant/module-flag.guard';
import { ConfigController } from './public/config.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    AppConfigModule,
    RedisModule,
    ClientsModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 60000, limit: 300 },
    ]),
  ],
  controllers: [ConfigController, HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
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
