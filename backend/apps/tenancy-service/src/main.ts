import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { TenancyModule } from './tenancy.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(TenancyModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.TENANCY_SERVICE_TCP_PORT ?? 3006),
    },
    logger: createAppLogger('tenancy-service'),
  });
  startMetricsServer('tenancy-service', Number(process.env.TENANCY_METRICS_PORT ?? 9465));
  await app.listen();
}
void bootstrap();
