/**
 * Self-hosted basemap builder (M10). Reads every tenant's OWN admin geometry from
 * Mongo `geo_features`, slices it into Mapbox Vector Tiles (geojson-vt + vt-pbf),
 * packs the tiles into a single PMTiles v3 archive, and uploads that one static
 * object to MinIO. The mobile/web client then fetches map tiles by HTTP range
 * request straight from object storage — no tile server, no per-request third-party
 * billing. This is the concrete proof of the "self-hosted, no per-API-call cost"
 * decision.
 *
 * The archive is a NEUTRAL basemap: it carries boundary/barangay/facility outlines
 * as visual context only. Meaningful, access-controlled data (report pins, alerts)
 * is never baked in here — it is served per-request through the tenant-scoped
 * geo-service and drawn as GeoJSON on top. Since the seeded cities are far apart,
 * a tenant's opening view (style.json centers + zooms on its own boundary) only
 * ever shows its own geometry.
 *
 * Run:  npx ts-node -P tsconfig.scripts.json scripts/geo/build-admin-basemap.ts
 *
 * PMTiles v3 spec: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md
 * GeoJSON coordinates are [lng, lat].
 */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { bbox } from '@turf/turf';
import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { zxyToTileId } from 'pmtiles';
import {
  buildPmtilesArchive,
  type PmTile,
} from '../../apps/geo-service/src/pmtiles/pmtiles-archive';

loadEnv({ path: path.resolve(__dirname, '../../.env.development') });

const MIN_ZOOM = 6;
const MAX_ZOOM = 14;
const LAYERS = ['boundary', 'barangay', 'facility'] as const;

const LOOSE = new mongoose.Schema({}, { strict: false, collection: 'geo_features' });

interface GeoDoc {
  tenantId: string;
  layer: string;
  name: string;
  properties?: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}
type FeatureCollection = { type: 'FeatureCollection'; features: unknown[] };

// ---- slippy-map tile math ------------------------------------------------
const lon2tile = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2tile = (lat: number, z: number) =>
  Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
      2) *
      2 ** z,
  );

async function main(): Promise<void> {
  const uri = process.env.MONGODB_GEO_URI;
  if (!uri) throw new Error('MONGODB_GEO_URI is required');
  const conn = await mongoose.createConnection(uri).asPromise();
  const Model = conn.model<GeoDoc>('BuildGeoFeature', LOOSE);
  const docs = await Model.find({ layer: { $in: LAYERS as unknown as string[] } }).lean<GeoDoc[]>();
  await conn.close();
  if (!docs.length) throw new Error('no geo_features found — run seed-geo first');

  // Group into one GeoJSON FeatureCollection per source-layer.
  const collections: Record<string, FeatureCollection> = {};
  for (const layer of LAYERS) collections[layer] = { type: 'FeatureCollection', features: [] };
  const allFeatures: unknown[] = [];
  for (const d of docs) {
    const feature = {
      type: 'Feature',
      geometry: d.geometry,
      properties: { tenant: d.tenantId, name: d.name, ...(d.properties ?? {}) },
    };
    collections[d.layer].features.push(feature);
    allFeatures.push(feature);
  }
  const bounds = bbox({ type: 'FeatureCollection', features: allFeatures } as never) as [
    number,
    number,
    number,
    number,
  ];

  // Index each layer independently so vt-pbf can merge them into one tile.
  const indexes = Object.fromEntries(
    LAYERS.map((l) => [l, geojsonvt(collections[l] as never, { maxZoom: MAX_ZOOM, buffer: 64 })]),
  );

  // Walk the tile pyramid over the data bounds; emit a gzipped MVT per non-empty tile.
  const tiles: PmTile[] = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const x0 = lon2tile(bounds[0], z);
    const x1 = lon2tile(bounds[2], z);
    const y0 = lat2tile(bounds[3], z); // north edge → smaller y
    const y1 = lat2tile(bounds[1], z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const layersInTile: Record<string, unknown> = {};
        for (const l of LAYERS) {
          const t = indexes[l].getTile(z, x, y);
          if (t && t.features.length) layersInTile[l] = t;
        }
        if (!Object.keys(layersInTile).length) continue;
        const pbf = vtpbf.fromGeojsonVt(layersInTile as never, { version: 2 });
        tiles.push({ tileId: zxyToTileId(z, x, y), data: zlib.gzipSync(Buffer.from(pbf)) });
      }
    }
  }

  const cLng = (bounds[0] + bounds[2]) / 2;
  const cLat = (bounds[1] + bounds[3]) / 2;
  const archive = buildPmtilesArchive(tiles, {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    bounds,
    center: [cLng, cLat],
    centerZoom: Math.round((MIN_ZOOM + MAX_ZOOM) / 2),
    metadata: {
      name: 'civic-basemap',
      type: 'baselayer',
      vector_layers: LAYERS.map((id) => ({
        id,
        minzoom: MIN_ZOOM,
        maxzoom: MAX_ZOOM,
        fields: { name: 'String', tenant: 'String' },
      })),
    },
  });
  console.log(
    `pmtiles: ${tiles.length} tiles, ${(archive.length / 1024).toFixed(1)} KiB, z${MIN_ZOOM}-${MAX_ZOOM}`,
  );

  // Upload the single static archive to MinIO (public-read bucket).
  const bucket = process.env.S3_BUCKET ?? 'civic-media';
  const key = process.env.GEO_BASEMAP_KEY ?? 'basemap/ph.pmtiles';
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? '',
      secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    },
  });
  await s3.send(new CreateBucketCommand({ Bucket: bucket })).catch(() => undefined);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: archive,
      ContentType: 'application/octet-stream',
      CacheControl: 'public, max-age=86400',
    }),
  );
  console.log(`uploaded → s3://${bucket}/${key}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
