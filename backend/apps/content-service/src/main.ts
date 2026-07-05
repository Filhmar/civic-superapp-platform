import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { ContentModule } from './content.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ContentModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.CONTENT_SERVICE_TCP_PORT ?? 3012),
    },
    logger: createAppLogger('content-service'),
  });
  startMetricsServer('content-service', Number(process.env.CONTENT_METRICS_PORT ?? 9467));
  await app.listen();
}
void bootstrap();
