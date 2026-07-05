/**
 * Control-plane utility standing in for the staff console (dept_staff/treasurer):
 *   ts-node scripts/transition-application.ts <tenantKey> <stubId> <to> [note]
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { firstValueFrom } from 'rxjs';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

async function main(): Promise<void> {
  const [tenantKey, stubId, to, note] = process.argv.slice(2);
  if (!tenantKey || !stubId || !to) {
    throw new Error('usage: transition-application.ts <tenantKey> <stubId> <to> [note]');
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

  const egov = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: process.env.EGOV_SERVICE_TCP_HOST ?? 'localhost',
      port: Number(process.env.EGOV_SERVICE_TCP_PORT ?? 3008),
    },
  });
  const result = await firstValueFrom(
    egov.send(
      { cmd: 'egov.application.transition' },
      { tenant, data: { stub_id: stubId, to, actor: 'staff:treasurer_demo', note } },
    ),
  );
  egov.close();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
