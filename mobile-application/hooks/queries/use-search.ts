import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getRecentSearches, search } from "@/services/search";

export function useSearchQuery(q: string) {
  return useQuery({
    queryKey: queryKeys.search.results(q),
    queryFn: () => search(q),
    enabled: q.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useRecentSearchesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.search.recent(),
    queryFn: getRecentSearches,
    enabled: options?.enabled ?? true,
  });
}
