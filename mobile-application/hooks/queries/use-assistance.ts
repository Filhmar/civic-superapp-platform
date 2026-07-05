import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import {
  getAssistancePrograms,
  getAssistanceRequest,
  getMyAssistanceRequests,
} from "@/services/assistance";

export function useAssistanceProgramsQuery() {
  return useQuery({
    queryKey: queryKeys.assistance.programs(),
    queryFn: getAssistancePrograms,
    staleTime: 60 * 60 * 1000,
  });
}

export function useMyAssistanceRequestsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.assistance.requests(),
    queryFn: getMyAssistanceRequests,
    enabled: options?.enabled ?? true,
  });
}

export function useAssistanceRequestQuery(requestId: string) {
  return useQuery({
    queryKey: queryKeys.assistance.request(requestId),
    queryFn: () => getAssistanceRequest(requestId),
    enabled: requestId.length > 0,
  });
}
