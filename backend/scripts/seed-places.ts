/**
 * Seed per-tenant POIs (tourism/business/civic) + transport routes. Pure DATA.
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

const LOOSE = (collection: string) =>
  new mongoose.Schema({}, { strict: false, collection, timestamps: true });

const WEEK = (open: string, close: string) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open, close }));
const WEEKDAYS = (open: string, close: string) =>
  [1, 2, 3, 4, 5].map((day) => ({ day, open, close }));

const POIS: Record<string, object[]> = {
  'ph-cavite-dasmarinas': [
    { kind: 'tourism', name: 'Museo De La Salle', description: 'Lifestyle museum showcasing 19th-century ilustrado heritage inside the DLSU-D campus.', category: 'Museum', rating: 4.6, geo: { lat: 14.3268, lng: 120.9407 }, address: 'DLSU-D Campus, Dasmariñas', contact: '(046) 481-1900', hours: WEEKDAYS('09:00', '17:00'), order: 1 },
    { kind: 'tourism', name: 'Immaculate Conception Parish Church', description: 'Historic 19th-century stone church at the heart of the poblacion.', category: 'Heritage', rating: 4.7, geo: { lat: 14.3297, lng: 120.9370 }, address: 'Poblacion, Dasmariñas', hours: WEEK('05:00', '19:00'), order: 2 },
    { kind: 'tourism', name: 'Dasmariñas City Plaza', description: 'Open plaza for events, festivals, and the Paru-paró Festival street dancing.', category: 'Park', rating: 4.3, geo: { lat: 14.3301, lng: 120.9362 }, hours: WEEK('05:00', '22:00'), order: 3 },
    { kind: 'business', name: 'SM City Dasmariñas', description: 'Major shopping mall with supermarket, cinemas, and dining.', category: 'Mall', rating: 4.4, geo: { lat: 14.3129, lng: 120.9405 }, contact: '(046) 424-2801', hours: WEEK('10:00', '21:00'), order: 4 },
    { kind: 'business', name: 'Robinsons Place Dasmariñas', description: 'Retail and dining complex along Aguinaldo Highway.', category: 'Mall', rating: 4.3, geo: { lat: 14.3423, lng: 120.9334 }, hours: WEEK('10:00', '21:00'), order: 5 },
    { kind: 'civic', name: 'Dasmariñas City Hall', description: 'Seat of the city government; permits, treasury, and civil registry.', category: 'Government', rating: 4.1, geo: { lat: 14.3294, lng: 120.9367 }, contact: '(046) 416-0139', hours: WEEKDAYS('07:00', '17:00'), order: 6 },
    { kind: 'civic', name: 'Pagamutan ng Dasmariñas', description: 'City-run hospital providing public healthcare services.', category: 'Hospital', rating: 4.0, geo: { lat: 14.3211, lng: 120.9422 }, contact: '(046) 481-8000', hours: WEEK('00:00', '23:59'), order: 7 },
  ],
  'ph-sorsogon-sorsogoncity': [
    { kind: 'tourism', name: 'Rompeolas (Sorsogon Baywalk)', description: 'Seaside promenade with sunset views over Sorsogon Bay.', category: 'Park', rating: 4.5, geo: { lat: 12.9689, lng: 124.0089 }, hours: WEEK('05:00', '22:00'), order: 1 },
    { kind: 'tourism', name: 'Sorsogon Cathedral (Sts. Peter and Paul)', description: 'Historic cathedral at the center of the city.', category: 'Heritage', rating: 4.6, geo: { lat: 12.9737, lng: 124.0055 }, hours: WEEK('05:00', '19:00'), order: 2 },
    { kind: 'tourism', name: 'Bucalbucalan Spring', description: 'Natural cold spring pools at the foot of Mt. Bulusan foothills.', category: 'Nature', rating: 4.4, geo: { lat: 12.9958, lng: 124.0353 }, hours: WEEK('07:00', '18:00'), order: 3 },
    { kind: 'business', name: 'Gaisano Capital Sorsogon', description: 'Department store and supermarket in the city center.', category: 'Mall', rating: 4.2, geo: { lat: 12.9721, lng: 124.0043 }, hours: WEEK('09:00', '20:00'), order: 4 },
    { kind: 'business', name: 'Sorsogon Public Market', description: 'Fresh produce, dried fish (pinangat!), and local goods.', category: 'Market', rating: 4.1, geo: { lat: 12.9705, lng: 124.0031 }, hours: WEEK('04:00', '19:00'), order: 5 },
    { kind: 'civic', name: 'Sorsogon City Hall', description: 'Seat of the city government; permits, treasury, and civil registry.', category: 'Government', rating: 4.0, geo: { lat: 12.9714, lng: 124.0064 }, contact: '(056) 211-1234', hours: WEEKDAYS('08:00', '17:00'), order: 6 },
    { kind: 'civic', name: 'Sorsogon Provincial Hospital', description: 'Main public hospital serving the province.', category: 'Hospital', rating: 3.9, geo: { lat: 12.9768, lng: 124.0102 }, contact: '(056) 211-1717', hours: WEEK('00:00', '23:59'), order: 7 },
  ],
  'ph-albay-legazpi': [
    { kind: 'tourism', name: 'Mayon Volcano Skyline', description: 'Iconic near-perfect cone of Mayon Volcano — best viewed at sunrise from the city.', category: 'Nature', rating: 4.9, geo: { lat: 13.1624, lng: 123.7370 }, hours: WEEK('00:00', '23:59'), order: 1 },
    { kind: 'tourism', name: 'Ligñon Hill Nature Park', description: 'Hilltop viewpoint with 360° views of Mayon, the city, and Albay Gulf; zipline and trails.', category: 'Viewpoint', rating: 4.6, geo: { lat: 13.1585, lng: 123.7411 }, hours: WEEK('08:00', '21:00'), order: 2 },
    { kind: 'tourism', name: 'Legazpi Boulevard', description: 'Coastal boulevard for biking, jogging, and sunrise views over Albay Gulf.', category: 'Coastal', rating: 4.5, geo: { lat: 13.1290, lng: 123.7550 }, hours: WEEK('00:00', '23:59'), order: 3 },
    { kind: 'tourism', name: 'Sleeping Lion (Kapuntukan) Hill', description: 'Lion-shaped hill by the port district with day-hike trails and harbor views.', category: 'Viewpoint', rating: 4.4, geo: { lat: 13.1310, lng: 123.7620 }, hours: WEEK('06:00', '18:00'), order: 4 },
    { kind: 'tourism', name: 'Embarcadero de Legazpi', description: 'Waterfront lifestyle mall and boardwalk at the foot of Kapuntukan Hill.', category: 'Leisure', rating: 4.3, geo: { lat: 13.1418, lng: 123.7568 }, hours: WEEK('10:00', '22:00'), order: 5 },
    { kind: 'tourism', name: 'Ibalong Centrum', description: 'Events and festival center hosting the Ibálong Festival programs.', category: 'Culture', rating: 4.2, geo: { lat: 13.1420, lng: 123.7330 }, hours: WEEK('08:00', '17:00'), order: 6 },
    { kind: 'business', name: 'SM City Legazpi', description: 'Major shopping mall with supermarket, cinemas, and dining.', category: 'Mall', rating: 4.5, geo: { lat: 13.1370, lng: 123.7340 }, contact: '(052) 742-8888', hours: WEEK('10:00', '21:00'), order: 7 },
    { kind: 'business', name: 'Legazpi Public Market', description: 'Fresh produce, pili nuts, sili ice cream, and Bicolano goods.', category: 'Market', rating: 4.2, geo: { lat: 13.1440, lng: 123.7360 }, hours: WEEK('04:00', '19:00'), order: 8 },
    { kind: 'civic', name: 'Legazpi City Hall', description: 'Seat of the city government; permits, treasury, and civil registry.', category: 'Government', rating: 4.1, geo: { lat: 13.1391, lng: 123.7438 }, contact: '(052) 480-0421', hours: WEEKDAYS('07:00', '17:00'), order: 9 },
    { kind: 'civic', name: 'Bicol Regional Hospital (BRHMC)', description: 'Regional hospital and medical center with 24/7 emergency room.', category: 'Hospital', rating: 4.0, geo: { lat: 13.1560, lng: 123.7290 }, contact: '(052) 483-0016', hours: WEEK('00:00', '23:59'), order: 10 },
  ],
};

const ROUTES: Record<string, object[]> = {
  'ph-cavite-dasmarinas': [
    { mode: 'jeepney', name: 'Zapote–Dasmariñas (Aguinaldo Hwy)', stops: ['Zapote', 'Bacoor', 'Imus', 'Anabu', 'Dasmariñas Bayan', 'SM Dasmariñas'], fareMin: 13, fareMax: 45, popular: true, order: 1 },
    { mode: 'jeepney', name: 'Dasmariñas Bayan–Salitran', stops: ['Dasmariñas Bayan', 'Salitran I', 'Salitran II', 'Salitran IV'], fareMin: 12, fareMax: 20, popular: true, order: 2 },
    { mode: 'jeepney', name: 'Dasmariñas Bayan–Paliparan', stops: ['Dasmariñas Bayan', 'Burol', 'Paliparan I', 'Paliparan III'], fareMin: 12, fareMax: 25, popular: false, order: 3 },
    { mode: 'uv', name: 'Dasmariñas–PITX (UV Express)', stops: ['SM Dasmariñas', 'Imus', 'Bacoor', 'PITX'], fareMin: 60, fareMax: 85, popular: true, order: 4 },
    { mode: 'tricycle', name: 'Bayan–Zone IV (tricycle zone)', stops: ['Dasmariñas Bayan', 'Zone I', 'Zone II', 'Zone IV'], fareMin: 15, fareMax: 30, popular: false, order: 5 },
  ],
  'ph-sorsogon-sorsogoncity': [
    { mode: 'jeepney', name: 'City Center–Bibincahan', stops: ['City Hall', 'Sorsogon Cathedral', 'Capitol', 'Bibincahan'], fareMin: 12, fareMax: 18, popular: true, order: 1 },
    { mode: 'tricycle', name: 'Centro–Talisay', stops: ['Public Market', 'Centro', 'Sirangan', 'Talisay'], fareMin: 15, fareMax: 25, popular: true, order: 2 },
    { mode: 'van', name: 'Sorsogon–Legazpi (Grand Terminal)', stops: ['Sorsogon Grand Terminal', 'Castilla', 'Daraga', 'Legazpi'], fareMin: 90, fareMax: 120, popular: true, order: 3 },
    { mode: 'jeepney', name: 'Centro–Bacon District', stops: ['Public Market', 'Cabid-an', 'Bacon Poblacion'], fareMin: 20, fareMax: 35, popular: false, order: 4 },
  ],
  'ph-albay-legazpi': [
    { mode: 'jeepney', name: 'Legazpi–Daraga', stops: ['Grand Central Terminal', 'SM City Legazpi', 'Old Albay District', 'Daraga Centro'], fareMin: 13, fareMax: 15, popular: true, order: 1 },
    { mode: 'van', name: 'Legazpi–Tabaco', stops: ['Grand Central Terminal', 'Sto. Domingo', 'Malilipot', 'Tabaco City'], fareMin: 70, fareMax: 90, popular: true, order: 2 },
    { mode: 'tricycle', name: 'Downtown–Boulevard Loop', stops: ['Rizal St.', 'Peñaranda Park', 'Ibalong Centrum', 'Legazpi Boulevard'], fareMin: 15, fareMax: 25, popular: true, order: 3 },
    { mode: 'jeepney', name: 'Rawis–Old Albay District', stops: ['Rawis Terminal', 'Bicol University', 'Peñaranda St.', 'Old Albay District'], fareMin: 13, fareMax: 18, popular: false, order: 4 },
    { mode: 'van', name: 'Legazpi–Bicol Int’l Airport (Shuttle)', stops: ['Grand Central Terminal', 'Legazpi Boulevard', 'BIA, Daraga'], fareMin: 50, fareMax: 60, popular: false, order: 5 },
  ],
};

async function main(): Promise<void> {
  const uri = process.env.MONGODB_PLACES_URI;
  if (!uri) throw new Error('MONGODB_PLACES_URI is required');
  const conn = await mongoose.createConnection(uri).asPromise();
  const Poi = conn.model('SeedPoi', LOOSE('pois'));
  const Route = conn.model('SeedRoute', LOOSE('transport_routes'));
  for (const [tenantId, pois] of Object.entries(POIS)) {
    for (const p of pois) {
      const r = p as { name: string };
      await Poi.updateOne({ tenantId, name: r.name }, { $set: { ...p, tenantId } }, { upsert: true });
    }
    console.log(`pois/${tenantId}: ${pois.length}`);
  }
  for (const [tenantId, routes] of Object.entries(ROUTES)) {
    for (const r of routes) {
      const row = r as { name: string };
      await Route.updateOne({ tenantId, name: row.name }, { $set: { ...r, tenantId } }, { upsert: true });
    }
    console.log(`routes/${tenantId}: ${routes.length}`);
  }
  await conn.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
