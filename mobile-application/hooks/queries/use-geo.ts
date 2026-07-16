import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getBoundary, getFeatures, locate } from "@/services/geo";
import type { GeoLayer } from "@/types/geo";

// Boundary/overlays are effectively static per tenant — cache them hard so the
// map opens instantly from cache and re-fetches rarely.
export function useBoundaryQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.geo.boundary(),
    queryFn: getBoundary,
    staleTime: 24 * 60 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useGeoFeaturesQuery(
  bbox: [number, number, number, number] | null,
  layer?: GeoLayer,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.geo.features(bbox ? bbox.join(",") : "none", layer),
    queryFn: () => getFeatures(bbox as [number, number, number, number], layer),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: (options?.enabled ?? true) && bbox !== null,
  });
}

/** Reverse-geocode a pin against the tenant's own gazetteer (debounce upstream). */
export function useLocateQuery(
  point: { lat: number; lng: number } | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: point ? queryKeys.geo.locate(point.lat, point.lng) : queryKeys.geo.all,
    queryFn: () => locate(point!.lat, point!.lng),
    enabled: (options?.enabled ?? true) && point !== null,
    staleTime: 5 * 60 * 1000,
  });
}
