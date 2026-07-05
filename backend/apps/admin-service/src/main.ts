import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { AdminModule } from './admin.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AdminModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.ADMIN_SERVICE_TCP_PORT ?? 3018),
    },
    logger: createAppLogger('admin-service'),
  });
  startMetricsServer('admin-service', Number(process.env.ADMIN_METRICS_PORT ?? 9476));
  await app.listen();
}
void bootstrap();
