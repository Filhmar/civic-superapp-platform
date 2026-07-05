import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { MediaModule } from './media.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(MediaModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.MEDIA_SERVICE_TCP_PORT ?? 3016),
    },
    logger: createAppLogger('media-service'),
  });
  startMetricsServer('media-service', Number(process.env.MEDIA_METRICS_PORT ?? 9471));
  await app.listen();
}
void bootstrap();
