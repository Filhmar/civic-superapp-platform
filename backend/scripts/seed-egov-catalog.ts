/**
 * Seed per-tenant e-gov service catalogs + convenience-fee rules (Reference §5.2).
 * Fees, requirements and groupings are LGU ordinance DATA — they differ by tenant.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/egov-service/generated/prisma/client';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

type Item = {
  code: string;
  group: string;
  name: string;
  description: string;
  fee: number;
  requirements: string[];
  processingDays: number;
};

const CATALOGS: Record<string, { convenienceFee: number; items: Item[] }> = {
  'ph-cavite-dasmarinas': {
    convenienceFee: 20,
    items: [
      { code: 'CTC', group: 'Taxes', name: 'Community Tax Certificate (Cedula)', description: 'Individual community tax certificate.', fee: 100, requirements: ['Valid government ID'], processingDays: 1 },
      { code: 'RPT', group: 'Taxes', name: 'Real Property Tax Payment', description: 'Quarterly or annual real property tax.', fee: 1500, requirements: ['Tax declaration number', 'Previous OR'], processingDays: 1 },
      { code: 'BRGY', group: 'Clearances', name: 'Barangay Clearance', description: 'Certificate of residency and good standing from your barangay.', fee: 75, requirements: ['Valid ID', 'Proof of residency'], processingDays: 2 },
      { code: 'MYRC', group: 'Clearances', name: "Mayor's Clearance", description: 'City-level clearance for employment or firearms licensing.', fee: 150, requirements: ['Barangay clearance', 'Valid ID', '2x2 photo'], processingDays: 3 },
      { code: 'BPRM', group: 'Permits', name: 'Business Permit Renewal', description: 'Annual renewal of business/mayor’s permit.', fee: 2500, requirements: ['Previous permit', 'BIR registration', 'Barangay business clearance'], processingDays: 5 },
      { code: 'BCRT', group: 'Civil Registry', name: 'Birth Certificate (Local Copy)', description: 'Certified local civil registry copy of birth certificate.', fee: 155, requirements: ['Valid ID of requester'], processingDays: 2 },
    ],
  },
  'ph-sorsogon-sorsogoncity': {
    convenienceFee: 20,
    items: [
      { code: 'CTC', group: 'Taxes', name: 'Community Tax Certificate (Cedula)', description: 'Individual community tax certificate.', fee: 80, requirements: ['Valid government ID'], processingDays: 1 },
      { code: 'RPT', group: 'Taxes', name: 'Real Property Tax Payment', description: 'Quarterly or annual real property tax.', fee: 1200, requirements: ['Tax declaration number'], processingDays: 1 },
      { code: 'BRGY', group: 'Clearances', name: 'Barangay Clearance', description: 'Certificate of residency and good standing from your barangay.', fee: 60, requirements: ['Valid ID', 'Proof of residency'], processingDays: 2 },
      { code: 'MYRC', group: 'Clearances', name: "Mayor's Clearance", description: 'City-level clearance for employment or licensing.', fee: 120, requirements: ['Barangay clearance', 'Valid ID'], processingDays: 3 },
      { code: 'BPRM', group: 'Permits', name: 'Business Permit Renewal', description: 'Annual renewal of business/mayor’s permit.', fee: 2000, requirements: ['Previous permit', 'BIR registration'], processingDays: 5 },
      { code: 'MCRT', group: 'Civil Registry', name: 'Marriage Certificate (Local Copy)', description: 'Certified local civil registry copy of marriage certificate.', fee: 140, requirements: ['Valid ID of requester'], processingDays: 2 },
    ],
  },
};

async function main(): Promise<void> {
  const url = process.env.EGOV_SERVICE_DATABASE_URL;
  if (!url) throw new Error('EGOV_SERVICE_DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  for (const [tenantId, { convenienceFee, items }] of Object.entries(CATALOGS)) {
    await prisma.feeRule.upsert({
      where: { tenantId },
      create: { tenantId, convenienceFee },
      update: { convenienceFee },
    });
    for (const item of items) {
      await prisma.serviceCatalogItem.upsert({
        where: { tenantId_code: { tenantId, code: item.code } },
        create: { ...item, tenantId },
        update: { ...item },
      });
    }
    console.log(`${tenantId}: ${items.length} services, convenience fee ${convenienceFee}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
