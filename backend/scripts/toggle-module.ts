/**
 * Control-plane utility: flip a module flag for a tenant by appending a new
 * config version (config is versioned data). Usage:
 *   ts-node scripts/toggle-module.ts <tenantId> <module> <true|false>
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { firstValueFrom } from 'rxjs';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import Redis from 'ioredis';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

async function main(): Promise<void> {
  const [tenantId, moduleName, value] = process.argv.slice(2);
  if (!tenantId || !moduleName || !['true', 'false'].includes(value)) {
    throw new Error('usage: toggle-module.ts <tenantId> <module> <true|false>');
  }
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: process.env.TENANCY_SERVICE_TCP_HOST ?? 'localhost',
      port: Number(process.env.TENANCY_SERVICE_TCP_PORT ?? 3006),
    },
  });
  const { config } = await firstValueFrom(
    client.send<{ version: number; config: { modules: Record<string, boolean> } }>(
      { cmd: 'config.get' },
      { tenantId },
    ),
  );
  config.modules[moduleName] = value === 'true';
  const res = await firstValueFrom(
    client.send<{ version: number }>({ cmd: 'config.upsert' }, { tenantId, config }),
  );
  console.log(`${tenantId} modules.${moduleName}=${value} -> config v${res.version}`);
  client.close();

  // Bust the gateway's short-lived tenant cache so the flip is visible immediately.
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });
  const keys = await redis.keys('tenant:ctx:*');
  if (keys.length) await redis.del(...keys);
  await redis.quit();
  console.log(`busted ${keys.length} cached tenant contexts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
