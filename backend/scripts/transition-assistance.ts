/**
 * Control-plane utility standing in for the CSWD officer:
 *   ts-node scripts/transition-assistance.ts <tenantKey> <requestId> <to> [note]
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { firstValueFrom } from 'rxjs';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

async function main(): Promise<void> {
  const [tenantKey, requestId, to, note] = process.argv.slice(2);
  if (!tenantKey || !requestId || !to) {
    throw new Error('usage: transition-assistance.ts <tenantKey> <requestId> <to> [note]');
  }
  const tenancy = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: process.env.TENANCY_SERVICE_TCP_HOST ?? 'localhost',
      port: Number(process.env.TENANCY_SERVICE_TCP_PORT ?? 3006),
    },
  });
  const tenant = await firstValueFrom(tenancy.send({ cmd: 'tenancy.resolve' }, { key: tenantKey }));
  tenancy.close();

  const assistance = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: process.env.ASSISTANCE_SERVICE_TCP_HOST ?? 'localhost',
      port: Number(process.env.ASSISTANCE_SERVICE_TCP_PORT ?? 3010),
    },
  });
  const result = await firstValueFrom(
    assistance.send(
      { cmd: 'assistance.request.transition' },
      { tenant, data: { request_id: requestId, to, actor: 'staff:cswd_officer_demo', note } },
    ),
  );
  assistance.close();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
