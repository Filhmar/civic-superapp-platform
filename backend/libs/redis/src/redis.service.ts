import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AppConfigService } from '@app/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis({
      host: config.get('REDIS_HOST'),
      port: config.get('REDIS_PORT'),
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }

  /** A dedicated connection (e.g. socket.io pub/sub duplicates). */
  duplicate(): Redis {
    return this.client.duplicate();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
