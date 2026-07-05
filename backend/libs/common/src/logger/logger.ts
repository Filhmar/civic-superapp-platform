import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export function createAppLogger(serviceName: string) {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize({ all: process.env.NODE_ENV !== 'production' }),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${String(timestamp)} [${serviceName}] ${level} ${context ? `[${String(context)}] ` : ''}${String(message)}${extra}`;
        }),
      ),
    }),
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: `${serviceName}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ];
  return WinstonModule.createLogger({ transports });
}
