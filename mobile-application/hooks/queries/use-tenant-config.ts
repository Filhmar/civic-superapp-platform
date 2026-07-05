/**
 * Thin query hook (STACK_BASIS §6): one useQuery wrapper — queryKey + service
 * fn, options passed through. Components never call services directly.
 */
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getTenantConfig } from "@/services/config";
import type { TenantConfigEnvelope } from "@/types/config";

export function useTenantConfigQuery(
  options?: Partial<UseQueryOptions<TenantConfigEnvelope>>,
) {
  return useQuery<TenantConfigEnvelope>({
    queryKey: queryKeys.config.all,
    queryFn: getTenantConfig,
    ...options,
  });
}
