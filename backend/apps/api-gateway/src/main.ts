import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import {
  AppConfigService,
  CorrelationIdInterceptor,
  ResponseInterceptor,
  createAppLogger,
  startMetricsServer,
} from '@app/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: createAppLogger('api-gateway'),
  });
  const config = app.get(AppConfigService);

  app.setGlobalPrefix('v1');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: config.isProduction,
    }),
  );
  app.useGlobalInterceptors(new CorrelationIdInterceptor(), new ResponseInterceptor());
  app.enableShutdownHooks();

  startMetricsServer('api-gateway', config.get('METRICS_PORT'));
  await app.listen(config.get('API_GATEWAY_PORT'));
}
void bootstrap();
