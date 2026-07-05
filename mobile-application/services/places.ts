import { api } from "@/services/api";
import type { Place, PlacesFilter } from "@/types/places";

interface Envelope<T> {
  success: boolean;
  data: T;
}

// NOTE: /v1/places GETs are public but the backend returns per-user favorite
// flags when Authorization is present; the request interceptor only attaches
// tokens to non-public paths, and "/places" is NOT in the public list — so
// tokens ride along automatically while unauthenticated calls still work
// (token attach is best-effort: no session → no header).

export async function getPlaces(filter?: PlacesFilter): Promise<Place[]> {
  const params: Record<string, string | number> = {};
  if (filter?.kind) params.kind = filter.kind;
  if (filter?.near) params.near = filter.near;
  if (filter?.limit !== undefined) params.limit = filter.limit;
  const body = await api.get<Envelope<Place[]>>("/v1/places", { params });
  return body.data;
}

export async function getPlace(id: string): Promise<Place> {
  const body = await api.get<Envelope<Place>>(`/v1/places/${id}`);
  return body.data;
}

export async function setPlaceFavorite(
  id: string,
  favorite: boolean,
): Promise<void> {
  if (favorite) await api.put(`/v1/places/${id}/favorite`);
  else await api.delete(`/v1/places/${id}/favorite`);
}
