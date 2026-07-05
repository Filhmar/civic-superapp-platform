/**
 * Seed CMS content for the two demo tenants. All of this is tenant DATA —
 * the platform code never references any of it.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

const POSTS = new mongoose.Schema({}, { strict: false, collection: 'posts', timestamps: true });
const FAQS = new mongoose.Schema({}, { strict: false, collection: 'faqs', timestamps: true });

interface TenantContent {
  tenantId: string;
  author: string;
  posts: Record<string, unknown>[];
  faqs: { locale: string; question: string; answer: string; order: number }[];
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

const CONTENT: TenantContent[] = [
  {
    tenantId: 'ph-cavite-dasmarinas',
    author: 'Dasmariñas City PIO',
    posts: [
      {
        title: 'City-wide clean-up drive this Saturday',
        body: 'Join the Sagip Linis city-wide clean-up this Saturday, 6 AM, starting at the City Plaza. Barangay marshals will lead sector teams. Bring gloves; bags are provided.',
        category: 'EVENT',
        pinned: true,
        publishedAt: daysAgo(1),
      },
      {
        title: 'Advisory: water interruption in Salitran area',
        body: 'Maynilad advises a scheduled water service interruption affecting Salitran I–IV on Thursday 10 PM to Friday 4 AM for mainline repairs. Store water in advance.',
        category: 'ADVISORY',
        pinned: true,
        publishedAt: daysAgo(2),
        targetUnits: ['Salitran I', 'Salitran II', 'Salitran III', 'Salitran IV'],
      },
      {
        title: 'Free anti-rabies vaccination for pets',
        body: 'The City Veterinary Office offers free anti-rabies shots for dogs and cats at the covered court, Zone II, this weekend, 8 AM–3 PM. First 500 pets per day.',
        category: 'PROGRAM',
        pinned: true,
        publishedAt: daysAgo(3),
      },
      {
        title: 'New business one-stop shop hours',
        body: 'The Business Permits and Licensing Office now opens 7 AM–5 PM on weekdays. Renewals can also be started in the app under e-Services.',
        category: 'GOVERNANCE',
        pinned: false,
        publishedAt: daysAgo(5),
      },
      {
        title: 'Paru-paró Festival street dance schedule',
        body: 'The annual Paru-paró Festival street dancing competition happens on the last Sunday of the month along Congressional Avenue. Road closures start 5 AM.',
        category: 'TOURISM',
        pinned: false,
        publishedAt: daysAgo(7),
      },
    ],
    faqs: [
      { locale: 'en', question: 'How do I get a barangay clearance?', answer: 'Open e-Services, choose Barangay Clearance, fill in the form, pay via GCash or card, then claim at your barangay hall with the QR stub.', order: 1 },
      { locale: 'en', question: 'How do I report a pothole or broken streetlight?', answer: 'Use the Report tab, pick a category, add a photo and pin the location. You will receive a ticket number you can track to resolution.', order: 2 },
      { locale: 'en', question: 'Is the SOS button free to use?', answer: 'Yes. SOS connects you to the city emergency dispatch and shares your live location. Misuse is punishable by ordinance.', order: 3 },
      { locale: 'fil', question: 'Paano kumuha ng barangay clearance?', answer: 'Buksan ang e-Services, piliin ang Barangay Clearance, sagutan ang form, magbayad gamit ang GCash o card, at kunin sa barangay hall gamit ang QR stub.', order: 1 },
      { locale: 'fil', question: 'Paano mag-report ng lubak o sirang ilaw?', answer: 'Gamitin ang Report tab, pumili ng kategorya, maglagay ng larawan at i-pin ang lokasyon. Makakatanggap ka ng ticket number na masusubaybayan.', order: 2 },
    ],
  },
  {
    tenantId: 'ph-sorsogon-sorsogoncity',
    author: 'Sorsogon City PIO',
    posts: [
      {
        title: 'Kasanggayahan Festival opens Monday',
        body: 'The Kasanggayahan Festival opens Monday with a civic parade from Capitol grounds to Rompeolas. Expect road closures along Magsaysay Street from 6 AM.',
        category: 'EVENT',
        pinned: true,
        publishedAt: daysAgo(1),
      },
      {
        title: 'Advisory: coastal flood watch for low-lying barangays',
        body: 'PAG-ASA forecasts higher-than-normal tides this week. Residents of Sirangan, Talisay and Pangpang are advised to secure belongings and monitor updates.',
        category: 'ADVISORY',
        pinned: true,
        publishedAt: daysAgo(2),
        targetUnits: ['Sirangan', 'Talisay', 'Pangpang'],
      },
      {
        title: 'Scholarship applications now open',
        body: 'The City Scholarship Program accepts applications until the end of the month. Requirements: Form 138, barangay certificate, and proof of income. Apply at CSWD or via Assistance in the app.',
        category: 'PROGRAM',
        pinned: true,
        publishedAt: daysAgo(3),
      },
      {
        title: 'Butanding interaction guidelines reminder',
        body: 'The City Tourism Office reminds all visitors and operators to observe the 4-meter distance rule during whale shark interactions in Sorsogon Bay.',
        category: 'TOURISM',
        pinned: false,
        publishedAt: daysAgo(4),
      },
      {
        title: 'City hall payment counters extended hours',
        body: 'Treasury payment counters extend to 6 PM every Friday this quarter to serve taxpayers renewing business permits.',
        category: 'GOVERNANCE',
        pinned: false,
        publishedAt: daysAgo(6),
      },
    ],
    faqs: [
      { locale: 'en', question: 'How do I get a community tax certificate (cedula)?', answer: 'Open e-Services, choose Community Tax Certificate, fill in your details, pay online, and claim at the Treasury window shown on your QR stub.', order: 1 },
      { locale: 'en', question: 'How do I report uncollected garbage?', answer: 'Use the Report tab, choose Garbage, add a photo and location pin. ENRO receives the ticket and you can track its status.', order: 2 },
      { locale: 'en', question: 'Where can I see whale sharks responsibly?', answer: 'Check Tourism in the app for accredited butanding interaction operators and the current guidelines.', order: 3 },
      { locale: 'fil', question: 'Paano kumuha ng cedula?', answer: 'Buksan ang e-Services, piliin ang Community Tax Certificate, sagutan ang detalye, magbayad online, at kunin sa Treasury window na nakasaad sa QR stub.', order: 1 },
      { locale: 'fil', question: 'Paano mag-report ng hindi nakolektang basura?', answer: 'Gamitin ang Report tab, piliin ang Garbage, maglagay ng larawan at lokasyon. Matatanggap ng ENRO ang ticket at masusubaybayan ang status.', order: 2 },
    ],
  },
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_CONTENT_URI;
  if (!uri) throw new Error('MONGODB_CONTENT_URI is required');
  await mongoose.connect(uri);
  const Post = mongoose.model('SeedPost', POSTS);
  const Faq = mongoose.model('SeedFaq', FAQS);

  for (const t of CONTENT) {
    const existing = await Post.countDocuments({ tenantId: t.tenantId });
    if (existing > 0) {
      console.log(`${t.tenantId}: ${existing} posts already present, skipping`);
      continue;
    }
    await Post.insertMany(t.posts.map((p) => ({ ...p, tenantId: t.tenantId, author: t.author })));
    await Faq.insertMany(t.faqs.map((f) => ({ ...f, tenantId: t.tenantId })));
    console.log(`${t.tenantId}: seeded ${t.posts.length} posts, ${t.faqs.length} faqs`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
