import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { SEED_TENANTS } from './seed-data';

async function main(): Promise<void> {
  const url = process.env.TENANCY_SERVICE_DATABASE_URL;
  if (!url) throw new Error('TENANCY_SERVICE_DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  for (const t of SEED_TENANTS) {
    await prisma.tenant.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        kind: t.kind,
        status: 'active',
        bundleId: t.bundleId,
        name: t.name,
        ticketPrefix: t.config.identifiers.ticket_prefix,
        residentIdPrefix: t.config.identifiers.resident_id_prefix,
      },
      update: {
        bundleId: t.bundleId,
        name: t.name,
        ticketPrefix: t.config.identifiers.ticket_prefix,
        residentIdPrefix: t.config.identifiers.resident_id_prefix,
      },
    });
    const latest = await prisma.tenantConfigVersion.findFirst({
      where: { tenantId: t.id },
      orderBy: { version: 'desc' },
    });
    const same = latest && JSON.stringify(latest.config) === JSON.stringify(t.config);
    if (!same) {
      await prisma.tenantConfigVersion.create({
        data: {
          tenantId: t.id,
          version: (latest?.version ?? 0) + 1,
          config: t.config as unknown as object,
        },
      });
      console.log(`Seeded config v${(latest?.version ?? 0) + 1} for ${t.id}`);
    } else {
      console.log(`Config for ${t.id} unchanged (v${latest.version})`);
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
