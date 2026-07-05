import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { AssistanceModule } from './assistance.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AssistanceModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.ASSISTANCE_SERVICE_TCP_PORT ?? 3010),
    },
    logger: createAppLogger('assistance-service'),
  });
  startMetricsServer('assistance-service', Number(process.env.ASSISTANCE_METRICS_PORT ?? 9473));
  await app.listen();
}
void bootstrap();
