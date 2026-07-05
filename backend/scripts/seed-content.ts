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
  {
    tenantId: 'ph-albay-legazpi',
    author: 'Legazpi City PIO',
    posts: [
      {
        title: 'Ibálong Festival 2026 set on August 7–23',
        body: 'The Ibálong Festival 2026 runs August 7–23 across Legazpi City, celebrating the epic of Baltog, Handyong, and Bantong with street presentations, trade fairs, and the grand Ibálong street parade along Rizal Street and Peñaranda Park.',
        category: 'EVENT',
        pinned: true,
        publishedAt: daysAgo(1),
      },
      {
        title: 'Ibálong 2026: follow only the official pages',
        body: 'The City PIO advises the public to follow only the official Ibálong Festival and City Government of Legazpi pages for schedules and advisories. Report fake pages and unofficial ticket sellers to the City Information Office.',
        category: 'ADVISORY',
        pinned: true,
        publishedAt: daysAgo(3),
      },
      {
        title: 'Legazpi is Bicol’s Top Economic Powerhouse 2026',
        body: 'Legazpi City ranks first in Bicol in the 2026 economic performance index, driven by tourism arrivals, EBOSS-enabled business registrations, and infrastructure growth around the Bicol International Airport corridor.',
        category: 'GOVERNANCE',
        pinned: true,
        publishedAt: daysAgo(7),
      },
      {
        title: 'Real Property Tax Amnesty under R.A. 12001',
        body: 'The City Treasurer’s Office reminds property owners that penalties and interests on unpaid real property taxes are condoned under R.A. 12001. Settle amilyar at City Hall or via e-Services in the app before the amnesty period ends.',
        category: 'GOVERNANCE',
        pinned: false,
        publishedAt: daysAgo(15),
      },
      {
        title: 'Sunrise viewing decks open at Ligñon Hill and Legazpi Boulevard',
        body: 'The City Tourism Office opens improved viewing decks for the Mayon Volcano skyline at Ligñon Hill Nature Park (8AM–9PM) and along Legazpi Boulevard. Best views at sunrise — tricycle loops run from downtown.',
        category: 'TOURISM',
        pinned: false,
        publishedAt: daysAgo(9),
      },
      {
        title: 'City scholarship and school supplies program now accepting applicants',
        body: 'The City Government opens applications for the Legazpi scholarship and school supplies assistance program. Apply at CSWDO Legazpi or through Assistance in the app with your Form 138 and barangay indigency certificate.',
        category: 'PROGRAM',
        pinned: false,
        publishedAt: daysAgo(11),
      },
    ],
    faqs: [
      { locale: 'en', question: 'How do I get a cedula (Community Tax Certificate)?', answer: 'Open e-Services, choose Community Tax Certificate (Cedula), fill in your details, pay ₱55 plus the ₱20 convenience fee via GCash or card, then claim at Window 4, City Hall — ready in 3–5 working days.', order: 1 },
      { locale: 'en', question: 'How do I report a pothole, flooding, or garbage problem?', answer: 'Use the Report tab, pick a category, add a photo, and pin the location (e.g., Peñaranda St., Rawis). You will get an LGZ ticket number you can track from Submitted to Resolved.', order: 2 },
      { locale: 'en', question: 'What happens when I hold the SOS button?', answer: 'Hold-to-SOS calls Legazpi City Rescue (CDRRMO) and Legazpi 911 while sharing your live location with dispatch. Quick dials for Police, Fire, and Medical are also on the SOS screen.', order: 3 },
      { locale: 'en', question: 'How do I renew my business permit online?', answer: 'Choose Business Permit (EBOSS) under e-Services — Legazpi’s online one-stop shop. Submit the form, pay online, and claim at City Hall with your QR stub. No queues.', order: 4 },
      { locale: 'fil', question: 'Paano kumuha ng cedula?', answer: 'Buksan ang e-Services, piliin ang Community Tax Certificate (Cedula), sagutan ang detalye, magbayad ng ₱55 kasama ang ₱20 convenience fee, at kunin sa Window 4 ng City Hall pagkalipas ng 3–5 araw.', order: 1 },
      { locale: 'fil', question: 'Paano mag-report ng butas sa daan o baha?', answer: 'Gamitin ang Report tab, pumili ng kategorya, maglagay ng larawan at i-pin ang lokasyon. Makakatanggap ka ng LGZ ticket number na masusubaybayan hanggang ma-resolve.', order: 2 },
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
