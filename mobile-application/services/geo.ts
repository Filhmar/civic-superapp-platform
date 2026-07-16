import { api } from "@/services/api";
import { ENV } from "@/constants/env";
import type {
  GeoBoundary,
  GeoFeatureCollection,
  GeoLayer,
  GeoLocateResult,
} from "@/types/geo";

interface Envelope<T> {
  success: boolean;
  data: T;
}

// The tenant is pinned by the shared X-Tenant-ID header (services/api.ts), so
// every geo call is already scoped to the installed app's city. These routes are
// public (no auth) — the map renders before login.

/** City outline + opening view (center/zoom/bbox) for the tenant. */
export async function getBoundary(): Promise<GeoBoundary> {
  const body = await api.get<Envelope<GeoBoundary>>("/v1/geo/boundary");
  return body.data;
}

/** Local reverse-geocode: containing barangay + nearest facility, tenant-only. */
export async function locate(lat: number, lng: number): Promise<GeoLocateResult> {
  const body = await api.get<Envelope<GeoLocateResult>>("/v1/geo/locate", {
    params: { lat, lng },
  });
  return body.data;
}

/** Tenant overlays intersecting a bbox ([minLng,minLat,maxLng,maxLat]). */
export async function getFeatures(
  bbox: [number, number, number, number],
  layer?: GeoLayer,
  limit?: number,
): Promise<GeoFeatureCollection> {
  const params: Record<string, string | number> = { bbox: bbox.join(",") };
  if (layer) params.layer = layer;
  if (limit !== undefined) params.limit = limit;
  const body = await api.get<Envelope<GeoFeatureCollection>>("/v1/geo/features", {
    params,
  });
  return body.data;
}

/**
 * Absolute URL of the self-hosted MapLibre style (neutral basemap on MinIO +
 * this tenant's opening view). Consumed by a MapLibre renderer in production;
 * the in-app MVP map draws the GeoJSON overlays above directly.
 */
export function styleUrl(): string {
  return `${ENV.API_URL}/v1/geo/style.json`;
}
