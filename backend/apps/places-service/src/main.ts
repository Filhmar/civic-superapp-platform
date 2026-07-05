import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { PlacesModule } from './places.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(PlacesModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.PLACES_SERVICE_TCP_PORT ?? 3013),
    },
    logger: createAppLogger('places-service'),
  });
  startMetricsServer('places-service', Number(process.env.PLACES_METRICS_PORT ?? 9475));
  await app.listen();
}
void bootstrap();
