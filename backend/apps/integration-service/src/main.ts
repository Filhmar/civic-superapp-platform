import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { IntegrationModule } from './integration.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(IntegrationModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.INTEGRATION_SERVICE_TCP_PORT ?? 3017),
    },
    logger: createAppLogger('integration-service'),
  });
  startMetricsServer('integration-service', Number(process.env.INTEGRATION_METRICS_PORT ?? 9469));
  await app.listen();
}
void bootstrap();
