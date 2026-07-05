import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { ReportsModule } from './reports.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ReportsModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.REPORTS_SERVICE_TCP_PORT ?? 3009),
    },
    logger: createAppLogger('reports-service'),
  });
  startMetricsServer('reports-service', Number(process.env.REPORTS_METRICS_PORT ?? 9470));
  await app.listen();
}
void bootstrap();
