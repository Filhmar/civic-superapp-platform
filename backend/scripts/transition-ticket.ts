/**
 * Control-plane utility standing in for the staff console (dept_staff role):
 *   ts-node scripts/transition-ticket.ts <tenantKey> <ticketId> <to> [note]
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { firstValueFrom } from 'rxjs';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

function client(hostVar: string, portVar: string, fallback: number) {
  return ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: process.env[hostVar] ?? 'localhost',
      port: Number(process.env[portVar] ?? fallback),
    },
  });
}

async function main(): Promise<void> {
  const [tenantKey, ticketIdArg, to, note] = process.argv.slice(2);
  if (!tenantKey || !ticketIdArg || !to) {
    throw new Error('usage: transition-ticket.ts <tenantKey> <ticketId> <to> [note]');
  }
  const tenancy = client('TENANCY_SERVICE_TCP_HOST', 'TENANCY_SERVICE_TCP_PORT', 3006);
  const tenant = await firstValueFrom(tenancy.send({ cmd: 'tenancy.resolve' }, { key: tenantKey }));
  tenancy.close();

  const reports = client('REPORTS_SERVICE_TCP_HOST', 'REPORTS_SERVICE_TCP_PORT', 3009);
  const result = await firstValueFrom(
    reports.send(
      { cmd: 'reports.ticket.transition' },
      { tenant, data: { ticket_id: ticketIdArg, to, actor: 'staff:dept_staff_demo', note } },
    ),
  );
  reports.close();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
