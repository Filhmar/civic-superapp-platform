import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { NotificationModule } from './notification.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(NotificationModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.NOTIFICATION_SERVICE_TCP_PORT ?? 3014),
    },
    logger: createAppLogger('notification-service'),
  });
  startMetricsServer('notification-service', Number(process.env.NOTIFICATION_METRICS_PORT ?? 9468));
  await app.listen();
}
void bootstrap();
