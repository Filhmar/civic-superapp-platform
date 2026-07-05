/**
 * Seed per-tenant 311 categories + department routing (Reference §5.3).
 * Pure tenant DATA — routing tables differ per LGU org structure.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

const SCHEMA = new mongoose.Schema({}, { strict: false, collection: 'report_categories' });

const CATEGORIES: Record<string, { key: string; label: string; icon: string; department: string; order: number }[]> = {
  'ph-cavite-dasmarinas': [
    { key: 'pothole', label: 'Road / Pothole', icon: 'construction', department: 'City Engineering Office', order: 1 },
    { key: 'garbage', label: 'Garbage', icon: 'trash-2', department: 'CENRO', order: 2 },
    { key: 'streetlight', label: 'Streetlight', icon: 'lightbulb', department: 'General Services Office', order: 3 },
    { key: 'flooding', label: 'Flooding / Drainage', icon: 'waves', department: 'CDRRMO', order: 4 },
    { key: 'stray-animals', label: 'Stray Animals', icon: 'dog', department: 'City Veterinary Office', order: 5 },
    { key: 'peace-order', label: 'Peace & Order', icon: 'shield-alert', department: 'City Public Safety Office', order: 6 },
  ],
  'ph-sorsogon-sorsogoncity': [
    { key: 'pothole', label: 'Road / Pothole', icon: 'construction', department: 'City Engineering Office', order: 1 },
    { key: 'garbage', label: 'Garbage', icon: 'trash-2', department: 'ENRO', order: 2 },
    { key: 'streetlight', label: 'Streetlight', icon: 'lightbulb', department: 'City Engineering Office', order: 3 },
    { key: 'flooding', label: 'Flooding / Coastal', icon: 'waves', department: 'CDRRMO', order: 4 },
    { key: 'stray-animals', label: 'Stray Animals', icon: 'dog', department: 'City Agriculture & Veterinary', order: 5 },
    { key: 'peace-order', label: 'Peace & Order', icon: 'shield-alert', department: 'City PNP Station', order: 6 },
  ],
  'ph-albay-legazpi': [
    { key: 'pothole', label: 'Pothole / Road', icon: 'construction', department: 'City Engineering Office', order: 1 },
    { key: 'flooding', label: 'Flooding', icon: 'waves', department: 'CDRRMO', order: 2 },
    { key: 'garbage', label: 'Garbage', icon: 'trash-2', department: 'City ENRO', order: 3 },
    { key: 'streetlight', label: 'Streetlight', icon: 'lightbulb', department: 'City Engineering Office', order: 4 },
    { key: 'stray-animals', label: 'Stray Animals', icon: 'dog', department: 'City Veterinary Office', order: 5 },
    { key: 'illegal-parking', label: 'Illegal Parking', icon: 'car', department: 'POSU', order: 6 },
  ],
};

async function main(): Promise<void> {
  const uri = process.env.MONGODB_REPORTS_URI;
  if (!uri) throw new Error('MONGODB_REPORTS_URI is required');
  await mongoose.connect(uri);
  const Cat = mongoose.model('SeedCategory', SCHEMA);
  for (const [tenantId, cats] of Object.entries(CATEGORIES)) {
    for (const c of cats) {
      await Cat.updateOne(
        { tenantId, key: c.key },
        { $set: { ...c, tenantId } },
        { upsert: true },
      );
    }
    console.log(`${tenantId}: ${cats.length} categories`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
