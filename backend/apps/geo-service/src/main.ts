import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { GeoModule } from './geo.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(GeoModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.GEO_SERVICE_TCP_PORT ?? 3019),
    },
    logger: createAppLogger('geo-service'),
  });
  startMetricsServer('geo-service', Number(process.env.GEO_METRICS_PORT ?? 9477));
  await app.listen();
}
void bootstrap();
