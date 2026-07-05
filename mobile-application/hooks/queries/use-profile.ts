import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getProfile } from "@/services/profile";

export function useProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: getProfile,
    enabled: options?.enabled ?? true,
  });
}
