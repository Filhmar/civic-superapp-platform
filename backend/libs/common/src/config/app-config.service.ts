import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigSchema } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<ConfigSchema, true>) {}

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.config.get(key, { infer: true });
  }

  /** Required variant: throws at call time if the optional var is unset. */
  require<K extends keyof ConfigSchema>(key: K): NonNullable<ConfigSchema[K]> {
    const value = this.get(key);
    if (value === undefined || value === null) {
      throw new Error(`Missing required config: ${String(key)}`);
    }
    return value as NonNullable<ConfigSchema[K]>;
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  tcpEndpoint(service: ServiceName): { host: string; port: number } {
    const prefix = SERVICE_ENV_PREFIX[service];
    return {
      host: this.get(`${prefix}_TCP_HOST` as keyof ConfigSchema) as string,
      port: this.get(`${prefix}_TCP_PORT` as keyof ConfigSchema) as number,
    };
  }

  get corsOrigins(): string[] {
    return this.get('CORS_ORIGINS')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export const SERVICE_ENV_PREFIX = {
  tenancy: 'TENANCY_SERVICE',
  identity: 'IDENTITY_SERVICE',
  egov: 'EGOV_SERVICE',
  reports: 'REPORTS_SERVICE',
  assistance: 'ASSISTANCE_SERVICE',
  emergency: 'EMERGENCY_SERVICE',
  content: 'CONTENT_SERVICE',
  places: 'PLACES_SERVICE',
  notification: 'NOTIFICATION_SERVICE',
  media: 'MEDIA_SERVICE',
  integration: 'INTEGRATION_SERVICE',
  admin: 'ADMIN_SERVICE',
} as const;

export type ServiceName = keyof typeof SERVICE_ENV_PREFIX;
