/**
 * Self-hosted geo (M10). Every shape here comes from the tenant-scoped
 * geo-service through the gateway — never a third-party geocoder/tile API, so
 * there is no per-request billing and no foreign geometry can appear.
 * GeoJSON coordinates are [lng, lat].
 */
export type GeoLayer = "boundary" | "barangay" | "facility" | "hazard" | "route";

export interface GeoGeometry {
  type: "Point" | "Polygon" | "MultiPolygon" | "LineString";
  coordinates: unknown;
}

export interface GeoBoundary {
  name: string;
  geometry: GeoGeometry;
  /** [minLng, minLat, maxLng, maxLat] */
  bbox: [number, number, number, number];
  center: { lat: number; lng: number };
  zoom: number;
}

export interface GeoLocateResult {
  inside: boolean;
  /** Containing barangay from the tenant's own gazetteer, or null. */
  unit: string | null;
  nearest_facility: { name: string; kind: string | null; distance_m: number } | null;
}

export interface GeoFeature {
  type: "Feature";
  id?: string;
  geometry: GeoGeometry;
  properties: { layer: GeoLayer; name: string; ref_id?: string | null } & Record<string, unknown>;
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}
