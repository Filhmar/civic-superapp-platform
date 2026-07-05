import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getHotlines } from "@/services/hotlines";

/** Persisted to AsyncStorage (see lib/query-client) so SOS works offline. */
export function useHotlinesQuery(tag?: string) {
  return useQuery({
    queryKey: queryKeys.hotlines.list(tag),
    queryFn: () => getHotlines(tag),
    staleTime: 60 * 60 * 1000,
    // Offline-first: cached data stays usable forever.
    gcTime: Infinity,
  });
}
