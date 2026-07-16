/**
 * Seed per-tenant GeoJSON overlays (M10): city boundary, a barangay gazetteer,
 * and civic facilities. Pure DATA — the geo-service code has no per-tenant branch.
 *
 * NOTE: these boundary/barangay polygons are APPROXIMATE placeholders (boxes
 * around known centroids) so the spatial pipeline is provable end-to-end. In
 * production a tenant admin replaces them with the LGU's official shapefiles via
 * POST /v1/admin/tenants/:id/geo/import — same data path, zero code change.
 *
 * GeoJSON coordinates are [lng, lat] (RFC 7946 / Mongo 2dsphere).
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

loadEnv({ path: path.resolve(__dirname, '../.env.development') });

const LOOSE = new mongoose.Schema({}, { strict: false, collection: 'geo_features', timestamps: true });

/** Axis-aligned box polygon of half-span `h` degrees around [lat,lng]. */
function box(lat: number, lng: number, h: number) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [lng - h, lat - h],
        [lng + h, lat - h],
        [lng + h, lat + h],
        [lng - h, lat + h],
        [lng - h, lat - h],
      ],
    ],
  };
}
const point = (lat: number, lng: number) => ({ type: 'Point' as const, coordinates: [lng, lat] });

interface Feature {
  layer: 'boundary' | 'barangay' | 'facility';
  name: string;
  properties?: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** Build a tenant's overlay set from its centroid + a few named barangays/facilities. */
function tenantFeatures(
  centroid: [number, number],
  barangayNames: string[],
  facilities: { name: string; kind: string; lat: number; lng: number }[],
): Feature[] {
  const [lat, lng] = centroid;
  const feats: Feature[] = [
    { layer: 'boundary', name: 'City Boundary', geometry: box(lat, lng, 0.06) },
  ];
  // 4 barangay cells; the first sits ON the centroid so locate(centroid) resolves it.
  const offs: [number, number][] = [
    [0, 0],
    [0.025, 0.025],
    [-0.025, 0.025],
    [0.025, -0.025],
  ];
  barangayNames.slice(0, 4).forEach((name, i) => {
    const [dLat, dLng] = offs[i];
    feats.push({
      layer: 'barangay',
      name,
      properties: { code: name.replace(/\s+/g, '-').toUpperCase() },
      geometry: box(lat + dLat, lng + dLng, 0.02),
    });
  });
  for (const f of facilities) {
    feats.push({
      layer: 'facility',
      name: f.name,
      properties: { kind: f.kind },
      geometry: point(f.lat, f.lng),
    });
  }
  return feats;
}

const TENANTS: Record<string, Feature[]> = {
  'ph-cavite-dasmarinas': tenantFeatures(
    [14.3294, 120.9367],
    ['Zone I', 'Salitran IV', 'Paliparan III', 'Sampaloc I'],
    [
      { name: 'Dasmariñas City Hall', kind: 'government', lat: 14.3294, lng: 120.9367 },
      { name: 'Pagamutan ng Dasmariñas', kind: 'hospital', lat: 14.3211, lng: 120.9422 },
      { name: 'CDRRMO Dasmariñas', kind: 'rescue', lat: 14.331, lng: 120.938 },
    ],
  ),
  'ph-sorsogon-sorsogoncity': tenantFeatures(
    [12.9714, 124.0064],
    ['Sirangan', 'Talisay', 'Balogo', 'Bibincahan'],
    [
      { name: 'Sorsogon City Hall', kind: 'government', lat: 12.9714, lng: 124.0064 },
      { name: 'Sorsogon Provincial Hospital', kind: 'hospital', lat: 12.9768, lng: 124.0102 },
      { name: 'Sorsogon CDRRMO', kind: 'rescue', lat: 12.972, lng: 124.007 },
    ],
  ),
  'ph-albay-legazpi': tenantFeatures(
    [13.1391, 123.7438],
    ['Rawis', 'Bogtong', 'Bitano', 'Em’s Barrio'],
    [
      { name: 'Legazpi City Hall', kind: 'government', lat: 13.1391, lng: 123.7438 },
      { name: 'Bicol Regional Hospital (BRHMC)', kind: 'hospital', lat: 13.156, lng: 123.729 },
      { name: 'Legazpi CDRRMO', kind: 'rescue', lat: 13.14, lng: 123.744 },
    ],
  ),
};

async function main(): Promise<void> {
  const uri = process.env.MONGODB_GEO_URI;
  if (!uri) throw new Error('MONGODB_GEO_URI is required');
  const conn = await mongoose.createConnection(uri).asPromise();
  const Model = conn.model('SeedGeoFeature', LOOSE);
  // 2dsphere index so seeds land in the same indexed shape the service queries.
  await Model.collection.createIndex({ geometry: '2dsphere' }).catch(() => undefined);
  for (const [tenantId, feats] of Object.entries(TENANTS)) {
    await Model.deleteMany({ tenantId });
    await Model.insertMany(feats.map((f) => ({ ...f, tenantId, properties: f.properties ?? {} })));
    const byLayer = feats.reduce<Record<string, number>>((a, f) => {
      a[f.layer] = (a[f.layer] ?? 0) + 1;
      return a;
    }, {});
    console.log(`geo/${tenantId}:`, JSON.stringify(byLayer));
  }
  await conn.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
