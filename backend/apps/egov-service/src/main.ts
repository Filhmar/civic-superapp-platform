import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { EgovModule } from './egov.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(EgovModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.EGOV_SERVICE_TCP_PORT ?? 3008),
    },
    logger: createAppLogger('egov-service'),
  });
  startMetricsServer('egov-service', Number(process.env.EGOV_METRICS_PORT ?? 9472));
  await app.listen();
}
void bootstrap();
