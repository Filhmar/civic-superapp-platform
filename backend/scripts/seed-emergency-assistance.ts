/**
 * Seed per-tenant hotlines + assistance programs (Reference §5.4/§5.5). Pure DATA.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

const LOOSE = (collection: string) =>
  new mongoose.Schema({}, { strict: false, collection, timestamps: false });

const HOTLINES: Record<string, { org: string; tag: string; numbers: string[]; order: number }[]> = {
  'ph-cavite-dasmarinas': [
    { org: 'CDRRMO Rescue Dasmariñas', tag: 'rescue', numbers: ['(046) 416-4444', '0917-123-4567'], order: 1 },
    { org: 'Dasmariñas City PNP', tag: 'police', numbers: ['(046) 416-0911', '0998-598-5730'], order: 2 },
    { org: 'Dasmariñas Fire Station (BFP)', tag: 'fire', numbers: ['(046) 416-0160'], order: 3 },
    { org: 'Pagamutan ng Dasmariñas (City Hospital)', tag: 'medical', numbers: ['(046) 481-8000'], order: 4 },
    { org: 'De La Salle Medical Center ER', tag: 'medical', numbers: ['(046) 481-8000 loc 1112'], order: 5 },
    { org: 'MERALCO Cavite', tag: 'utility', numbers: ['16211'], order: 6 },
    { org: 'Maynilad Hotline', tag: 'utility', numbers: ['1626'], order: 7 },
  ],
  'ph-sorsogon-sorsogoncity': [
    { org: 'Sorsogon CDRRMO Rescue', tag: 'rescue', numbers: ['(056) 211-1194', '0917-800-1194'], order: 1 },
    { org: 'Sorsogon City PNP', tag: 'police', numbers: ['(056) 211-1111', '0998-967-4321'], order: 2 },
    { org: 'Sorsogon City Fire Station (BFP)', tag: 'fire', numbers: ['(056) 211-1296'], order: 3 },
    { org: 'Sorsogon Provincial Hospital', tag: 'medical', numbers: ['(056) 211-1717'], order: 4 },
    { org: 'SORECO II (Electric Coop)', tag: 'utility', numbers: ['(056) 211-1342'], order: 5 },
    { org: 'Sorsogon City Water District', tag: 'utility', numbers: ['(056) 211-1268'], order: 6 },
  ],
};

const PROGRAMS: Record<string, { key: string; name: string; description: string; icon: string; office: string; requirements: string[]; order: number }[]> = {
  'ph-cavite-dasmarinas': [
    { key: 'medical', name: 'Medical Assistance', description: 'Financial aid for hospital bills, medicines, and laboratory fees.', icon: 'heart-pulse', office: 'CSWD Dasmariñas', requirements: ['Valid ID', 'Medical abstract or prescription', 'Statement of account', 'Barangay indigency certificate'], order: 1 },
    { key: 'financial', name: 'Financial / Livelihood Assistance', description: 'One-time cash aid and livelihood starter support.', icon: 'hand-coins', office: 'CSWD Dasmariñas', requirements: ['Valid ID', 'Barangay indigency certificate'], order: 2 },
    { key: 'educational', name: 'Educational Assistance', description: 'School supplies and tuition support for students.', icon: 'graduation-cap', office: 'City Scholarship Office', requirements: ['Valid ID', 'School registration form', 'Report card'], order: 3 },
    { key: 'transport', name: 'Transport / Ambulance', description: 'Free ambulance transfer or medical transport assistance.', icon: 'ambulance', office: 'CDRRMO', requirements: ['Valid ID', 'Medical referral'], order: 4 },
    { key: 'burial', name: 'Burial Assistance', description: 'Financial aid for funeral and burial expenses.', icon: 'flower-2', office: 'CSWD Dasmariñas', requirements: ['Valid ID', 'Death certificate', 'Funeral contract', 'Barangay indigency certificate'], order: 5 },
  ],
  'ph-sorsogon-sorsogoncity': [
    { key: 'medical', name: 'Medical Assistance', description: 'Aid for hospitalization, medicines, and diagnostics.', icon: 'heart-pulse', office: 'CSWDO Sorsogon City', requirements: ['Valid ID', 'Medical abstract', 'Statement of account', 'Barangay indigency certificate'], order: 1 },
    { key: 'financial', name: 'Financial / Livelihood Assistance', description: 'Emergency cash aid and livelihood support.', icon: 'hand-coins', office: 'CSWDO Sorsogon City', requirements: ['Valid ID', 'Barangay indigency certificate'], order: 2 },
    { key: 'educational', name: 'Educational Assistance', description: 'City scholarship and student aid program.', icon: 'graduation-cap', office: 'City Scholarship Program Office', requirements: ['Valid ID', 'Form 138', 'Certificate of enrollment', 'Proof of income'], order: 3 },
    { key: 'transport', name: 'Transport / Ambulance', description: 'Ambulance and patient transport service.', icon: 'ambulance', office: 'CDRRMO', requirements: ['Valid ID', 'Medical referral'], order: 4 },
    { key: 'burial', name: 'Burial Assistance', description: 'Aid for funeral and burial expenses.', icon: 'flower-2', office: 'CSWDO Sorsogon City', requirements: ['Valid ID', 'Death certificate', 'Funeral contract'], order: 5 },
  ],
};

async function seed(uriVar: string, collection: string, byTenant: Record<string, object[]>, matchKeys: string[]): Promise<void> {
  const uri = process.env[uriVar];
  if (!uri) throw new Error(`${uriVar} is required`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const Model = conn.model(`Seed_${collection}`, LOOSE(collection));
  for (const [tenantId, rows] of Object.entries(byTenant)) {
    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const filter: Record<string, unknown> = { tenantId };
      for (const k of matchKeys) filter[k] = r[k];
      await Model.updateOne(filter, { $set: { ...r, tenantId } }, { upsert: true });
    }
    console.log(`${collection}/${tenantId}: ${rows.length} rows`);
  }
  await conn.close();
}

async function main(): Promise<void> {
  await seed('MONGODB_EMERGENCY_URI', 'hotlines', HOTLINES, ['org']);
  await seed('MONGODB_ASSISTANCE_URI', 'programs', PROGRAMS, ['key']);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
