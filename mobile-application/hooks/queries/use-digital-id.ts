import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getDigitalId } from "@/services/digital-id";

export function useDigitalIdQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.auth.digitalId(),
    queryFn: getDigitalId,
    enabled: options?.enabled ?? true,
    // QR tokens are short-lived; keep this fresh.
    staleTime: 60 * 1000,
  });
}
