import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { EmergencyModule } from './emergency.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(EmergencyModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.EMERGENCY_SERVICE_TCP_PORT ?? 3011),
    },
    logger: createAppLogger('emergency-service'),
  });
  startMetricsServer('emergency-service', Number(process.env.EMERGENCY_METRICS_PORT ?? 9474));
  await app.listen();
}
void bootstrap();
