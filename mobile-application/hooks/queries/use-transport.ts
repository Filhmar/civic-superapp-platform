import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getTransportRoutes, matchTransportRoutes } from "@/services/transport";

export function useTransportRoutesQuery() {
  return useQuery({
    queryKey: queryKeys.transport.routes(),
    queryFn: getTransportRoutes,
    staleTime: 60 * 60 * 1000,
  });
}

export function useTransportMatchQuery(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.transport.match(from, to),
    queryFn: () => matchTransportRoutes(from, to),
    enabled: from.trim().length > 0 && to.trim().length > 0,
  });
}
