import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { bbox, centroid } from '@turf/turf';
import { TenantContext, rpcError } from '@app/common';
import { GeoFeature, GeoJsonGeometry, GeoLayer, GEO_LAYERS } from './schemas/geo-feature.schema';

/** GeoJSON is [lng, lat]; the rest of the platform speaks {lat,lng}. */
function pointGeoJson(lat: number, lng: number): GeoJsonGeometry {
  return { type: 'Point', coordinates: [lng, lat] };
}

/** Rough web-mercator zoom that frames a bbox on a ~360px phone map. */
function zoomForBbox([minX, minY, maxX, maxY]: [number, number, number, number]): number {
  const span = Math.max(maxX - minX, (maxY - minY) * 1.4, 0.001);
  const z = Math.log2(360 / span) - 0.2;
  return Math.min(16, Math.max(10, Math.round(z * 10) / 10));
}

export interface FeatureInput {
  layer: GeoLayer;
  name: string;
  refId?: string;
  properties?: Record<string, unknown>;
  geometry: GeoJsonGeometry;
}

@Injectable()
export class GeoService {
  constructor(@InjectModel(GeoFeature.name) private readonly features: Model<GeoFeature>) {}

  /** The tenant's outline + derived center/zoom/bbox — what the map opens to. */
  async boundary(tenant: TenantContext) {
    const doc = await this.features
      .findOne({ tenantId: tenant.tenantId, layer: 'boundary' })
      .lean();
    if (!doc) rpcError(404, 'No boundary configured for this tenant');
    const feature = { type: 'Feature' as const, geometry: doc.geometry, properties: {} };
    const box = bbox(feature as never) as [number, number, number, number];
    const c = centroid(feature as never).geometry.coordinates as [number, number];
    return {
      name: doc.name,
      geometry: doc.geometry,
      bbox: box, // [minLng, minLat, maxLng, maxLat]
      center: { lat: c[1], lng: c[0] },
      zoom: zoomForBbox(box),
    };
  }

  /**
   * Is a point inside the tenant's own territory? Uses the 2dsphere index via
   * $geoIntersects against the boundary polygon. Write-time gate for reports/POIs
   * so a pin can never land in another city. `configured` distinguishes "this
   * tenant has no boundary loaded yet" (don't block writes) from "point is outside
   * a real boundary" (reject) — the caller only rejects when configured && !inside.
   */
  async validate(
    tenant: TenantContext,
    lat: number,
    lng: number,
  ): Promise<{ inside: boolean; configured: boolean }> {
    const boundary = await this.features
      .findOne({ tenantId: tenant.tenantId, layer: 'boundary' }, { _id: 1 })
      .lean();
    if (!boundary) return { inside: true, configured: false };
    const hit = await this.features.exists({
      _id: boundary._id,
      geometry: { $geoIntersects: { $geometry: pointGeoJson(lat, lng) } },
    });
    return { inside: !!hit, configured: true };
  }

  /**
   * Local reverse-geocode against the tenant's OWN gazetteer only: the barangay
   * polygon that contains the point + the nearest civic facility. No external
   * geocoder, so a pin near a border never suggests a neighbouring city.
   */
  async locate(tenant: TenantContext, lat: number, lng: number) {
    const point = pointGeoJson(lat, lng);
    const [barangay, boundary, facility] = await Promise.all([
      this.features
        .findOne({
          tenantId: tenant.tenantId,
          layer: 'barangay',
          geometry: { $geoIntersects: { $geometry: point } },
        })
        .lean(),
      this.features
        .findOne({
          tenantId: tenant.tenantId,
          layer: 'boundary',
          geometry: { $geoIntersects: { $geometry: point } },
        })
        .lean(),
      this.features
        .findOne({
          tenantId: tenant.tenantId,
          layer: 'facility',
          geometry: { $near: { $geometry: point, $maxDistance: 5000 } },
        })
        .lean(),
    ]);
    return {
      inside: !!boundary,
      unit: barangay?.name ?? null, // the containing barangay (tenant gazetteer)
      nearest_facility: facility
        ? {
            name: facility.name,
            kind: (facility.properties?.kind as string) ?? null,
            distance_m: Math.round(
              haversineM(lat, lng, coordLat(facility.geometry), coordLng(facility.geometry)),
            ),
          }
        : null,
    };
  }

  /**
   * Features whose geometry intersects the viewport bbox — tenant-scoped AND
   * intersected with the boundary, so panning outside the city returns nothing
   * foreign. Returns a GeoJSON FeatureCollection the map renders directly.
   */
  async featuresInBbox(
    tenant: TenantContext,
    box: [number, number, number, number],
    layer?: GeoLayer,
    limit = 500,
  ) {
    const [minX, minY, maxX, maxY] = box;
    const viewport: GeoJsonGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
          [minX, minY],
        ],
      ],
    };
    const filter: Record<string, unknown> = {
      tenantId: tenant.tenantId,
      geometry: { $geoIntersects: { $geometry: viewport } },
    };
    if (layer) filter.layer = layer;
    const docs = await this.features.find(filter).limit(Math.min(limit, 2000)).lean();
    return {
      type: 'FeatureCollection' as const,
      features: docs.map((d) => ({
        type: 'Feature' as const,
        id: String(d._id),
        geometry: d.geometry,
        properties: { layer: d.layer, name: d.name, ref_id: d.refId ?? null, ...d.properties },
      })),
    };
  }

  /** Admin import: replace a tenant's features for the given layers. */
  async importFeatures(tenant: TenantContext, features: FeatureInput[], replaceLayers: GeoLayer[]) {
    for (const f of features) {
      if (!GEO_LAYERS.includes(f.layer)) rpcError(400, `Unknown layer: ${f.layer}`);
      if (!f.geometry?.type || f.geometry.coordinates == null) {
        rpcError(400, `Feature "${f.name}" has invalid geometry`);
      }
    }
    if (replaceLayers.length) {
      await this.features.deleteMany({ tenantId: tenant.tenantId, layer: { $in: replaceLayers } });
    }
    if (features.length) {
      await this.features.insertMany(
        features.map((f) => ({
          tenantId: tenant.tenantId,
          layer: f.layer,
          name: f.name,
          refId: f.refId,
          properties: f.properties ?? {},
          geometry: f.geometry,
        })),
      );
    }
    const counts = await this.features.aggregate<{ _id: string; n: number }>([
      { $match: { tenantId: tenant.tenantId } },
      { $group: { _id: '$layer', n: { $sum: 1 } } },
    ]);
    return { imported: features.length, layers: Object.fromEntries(counts.map((c) => [c._id, c.n])) };
  }
}

function coordLat(g: GeoJsonGeometry): number {
  return (g.coordinates as [number, number])[1];
}
function coordLng(g: GeoJsonGeometry): number {
  return (g.coordinates as [number, number])[0];
}
function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
