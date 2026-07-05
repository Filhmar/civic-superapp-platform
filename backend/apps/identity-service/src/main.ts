import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { createAppLogger, startMetricsServer } from '@app/common';
import { IdentityModule } from './identity.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(IdentityModule, {
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: Number(process.env.IDENTITY_SERVICE_TCP_PORT ?? 3007),
    },
    logger: createAppLogger('identity-service'),
  });
  startMetricsServer('identity-service', Number(process.env.IDENTITY_METRICS_PORT ?? 9466));
  await app.listen();
}
void bootstrap();
