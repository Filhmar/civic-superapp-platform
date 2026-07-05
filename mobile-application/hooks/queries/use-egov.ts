import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import {
  getApplication,
  getMyApplications,
  getServiceCatalog,
} from "@/services/egov";

export function useServiceCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.egov.catalog(),
    queryFn: getServiceCatalog,
    staleTime: 60 * 60 * 1000,
  });
}

export function useMyApplicationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.egov.applications(),
    queryFn: getMyApplications,
    enabled: options?.enabled ?? true,
  });
}

export function useApplicationQuery(stubId: string) {
  return useQuery({
    queryKey: queryKeys.egov.application(stubId),
    queryFn: () => getApplication(stubId),
    enabled: stubId.length > 0,
  });
}
