import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getPlace, getPlaces } from "@/services/places";
import type { PlacesFilter } from "@/types/places";

export function usePlacesQuery(filter?: PlacesFilter) {
  return useQuery({
    queryKey: queryKeys.places.list(filter),
    queryFn: () => getPlaces(filter),
  });
}

export function usePlaceQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.places.detail(id),
    queryFn: () => getPlace(id),
    enabled: id.length > 0,
  });
}
