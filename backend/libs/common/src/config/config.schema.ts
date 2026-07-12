import { z } from 'zod';

const port = (def: number) => z.coerce.number().min(1024).max(65535).default(def);
const tcpPort = (def: number) => z.coerce.number().min(1024).max(49151).default(def);
const host = z.string().default('localhost');

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),

  // Gateway
  API_GATEWAY_PORT: port(3005),
  CORS_ORIGINS: z.string().default('http://localhost:8081'),

  // Service TCP endpoints
  TENANCY_SERVICE_TCP_HOST: host,
  TENANCY_SERVICE_TCP_PORT: tcpPort(3006),
  IDENTITY_SERVICE_TCP_HOST: host,
  IDENTITY_SERVICE_TCP_PORT: tcpPort(3007),
  EGOV_SERVICE_TCP_HOST: host,
  EGOV_SERVICE_TCP_PORT: tcpPort(3008),
  REPORTS_SERVICE_TCP_HOST: host,
  REPORTS_SERVICE_TCP_PORT: tcpPort(3009),
  ASSISTANCE_SERVICE_TCP_HOST: host,
  ASSISTANCE_SERVICE_TCP_PORT: tcpPort(3010),
  EMERGENCY_SERVICE_TCP_HOST: host,
  EMERGENCY_SERVICE_TCP_PORT: tcpPort(3011),
  CONTENT_SERVICE_TCP_HOST: host,
  CONTENT_SERVICE_TCP_PORT: tcpPort(3012),
  PLACES_SERVICE_TCP_HOST: host,
  PLACES_SERVICE_TCP_PORT: tcpPort(3013),
  NOTIFICATION_SERVICE_TCP_HOST: host,
  NOTIFICATION_SERVICE_TCP_PORT: tcpPort(3014),
  MEDIA_SERVICE_TCP_HOST: host,
  MEDIA_SERVICE_TCP_PORT: tcpPort(3016),
  INTEGRATION_SERVICE_TCP_HOST: host,
  INTEGRATION_SERVICE_TCP_PORT: tcpPort(3017),
  ADMIN_SERVICE_TCP_HOST: host,
  ADMIN_SERVICE_TCP_PORT: tcpPort(3018),

  // TCP client reconnection
  TCP_CONNECTION_MAX_RETRIES: z.coerce.number().default(50),
  TCP_CONNECTION_BASE_DELAY: z.coerce.number().default(1000),
  TCP_CONNECTION_MAX_DELAY: z.coerce.number().default(30000),

  // Metrics
  METRICS_PORT: port(9464),

  // Postgres
  TENANCY_SERVICE_DATABASE_URL: z.url().optional(),
  IDENTITY_SERVICE_DATABASE_URL: z.url().optional(),
  EGOV_SERVICE_DATABASE_URL: z.url().optional(),
  ADMIN_SERVICE_DATABASE_URL: z.url().optional(),

  // MongoDB
  MONGODB_REPORTS_URI: z.url().optional(),
  MONGODB_ASSISTANCE_URI: z.url().optional(),
  MONGODB_EMERGENCY_URI: z.url().optional(),
  MONGODB_CONTENT_URI: z.url().optional(),
  MONGODB_PLACES_URI: z.url().optional(),
  MONGODB_NOTIFICATION_URI: z.url().optional(),
  MONGODB_MEDIA_URI: z.url().optional(),

  // Redis
  REDIS_HOST: host,
  REDIS_PORT: z.coerce.number().default(6379),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(64).optional(),
  JWT_REFRESH_SECRET: z.string().min(64).optional(),
  JWT_ACCESS_EXPIRES_IN: z.coerce.number().default(900),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().default(604800),
  DIGITAL_ID_QR_SECRET: z.string().min(64).optional(),
  JWT_ADMIN_ACCESS_SECRET: z.string().min(64).optional(),
  JWT_ADMIN_REFRESH_SECRET: z.string().min(64).optional(),
  ADMIN_SEED_EMAIL: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),

  // OTP
  OTP_LENGTH: z.coerce.number().min(4).max(8).default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  MAX_OTP_ATTEMPTS: z.coerce.number().default(5),
  MAX_OTP_REQUESTS_PER_PHONE_PER_HOUR: z.coerce.number().default(5),
  MAX_OTP_REQUESTS_PER_PHONE_PER_DAY: z.coerce.number().default(15),
  MAX_OTP_REQUESTS_PER_IP_PER_HOUR: z.coerce.number().default(20),
  SMS_PROVIDER: z.enum(['mock', 'semaphore']).default('mock'),

  // OTP delivery driver (global, not per-tenant). mock = dev/log; usapp = via integration-service.
  OTP_DELIVERY_DRIVER: z.enum(['mock', 'usapp']).default('mock'),

  // Usapp (integration-service only). Secret; never committed.
  USAPP_BASE_URL: z.url().optional(),
  USAPP_API_KEY: z.string().optional(),
  USAPP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // Object storage
  S3_ENDPOINT: z.url().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().default('civic-media'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  S3_PUBLIC_ENDPOINT: z.url().optional(),

  // Integrations
  WEATHER_PROVIDER: z.enum(['mock', 'openweather']).default('mock'),
  OPENWEATHER_API_KEY: z.string().optional(),

  // App/product
  APP_MIN_SUPPORTED_VERSION: z.string().default('1.0.0'),

  // Socket.io
  SOCKET_IO_ADAPTER: z.enum(['memory', 'redis']).default('memory'),
}).superRefine((env, ctx) => {
  // No silent no-op OTP channel in production.
  if (env.NODE_ENV === 'production' && env.OTP_DELIVERY_DRIVER === 'mock') {
    ctx.addIssue({
      code: 'custom',
      path: ['OTP_DELIVERY_DRIVER'],
      message: 'must not be `mock` in production — it logs codes and delivers none.',
    });
  }
  // The usapp driver needs its credentials.
  if (env.OTP_DELIVERY_DRIVER === 'usapp') {
    if (!env.USAPP_BASE_URL) {
      ctx.addIssue({ code: 'custom', path: ['USAPP_BASE_URL'], message: 'required when OTP_DELIVERY_DRIVER=usapp' });
    }
    if (!env.USAPP_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['USAPP_API_KEY'], message: 'required when OTP_DELIVERY_DRIVER=usapp' });
    }
  }
});

export type ConfigSchema = z.infer<typeof configSchema>;

export function validateConfig(env: Record<string, unknown>): ConfigSchema {
  const result = configSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Config validation failed:\n${result.error.message}`);
  }
  return result.data;
}
