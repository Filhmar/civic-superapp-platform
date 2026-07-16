import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * A tenant-scoped GeoJSON feature. Basemap tiles are shared/neutral; THESE are
 * the meaningful, tenant-owned overlays — boundaries, barangays, facilities,
 * hazard zones. Every query filters by tenantId and clips to the tenant extent,
 * so no foreign geometry can ever be returned or suggested (Reference §2/§5.7).
 */
export const GEO_LAYERS = [
  'boundary', // city/municipality outline (Polygon/MultiPolygon)
  'barangay', // barangay boundary (Polygon) — the gazetteer for reverse-geocode
  'facility', // civic facility point (Point)
  'hazard', // flood/hazard zone (Polygon)
  'route', // transport route geometry (LineString)
] as const;
export type GeoLayer = (typeof GEO_LAYERS)[number];

/** GeoJSON geometry — coordinates are [lng, lat] (RFC 7946 / Mongo 2dsphere). */
export interface GeoJsonGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon' | 'LineString';
  coordinates: unknown;
}

@Schema({ timestamps: true, collection: 'geo_features' })
export class GeoFeature {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ type: String, required: true, enum: GEO_LAYERS })
  layer!: GeoLayer;

  @Prop({ required: true })
  name!: string;

  /** Optional back-reference to the owning domain doc (e.g. a ticket id). */
  @Prop()
  refId?: string;

  @Prop({ type: Object, default: {} })
  properties!: Record<string, unknown>;

  // GeoJSON geometry with a 2dsphere index — powers $geoWithin / $near /
  // $geoIntersects instead of the old in-JS Haversine. Stored as Mixed because
  // coordinate nesting varies by geometry type (Point vs Polygon vs LineString);
  // the 2dsphere index below indexes it as GeoJSON regardless.
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  geometry!: GeoJsonGeometry;
}

export type GeoFeatureDocument = HydratedDocument<GeoFeature>;
export const GeoFeatureSchema = SchemaFactory.createForClass(GeoFeature);
GeoFeatureSchema.index({ geometry: '2dsphere' });
GeoFeatureSchema.index({ tenantId: 1, layer: 1 });
