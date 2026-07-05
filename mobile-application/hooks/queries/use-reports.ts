import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import {
  getMyReports,
  getReport,
  getReportCategories,
} from "@/services/reports";

export function useReportCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.reports.categories(),
    queryFn: getReportCategories,
    staleTime: 60 * 60 * 1000, // categories rarely change
  });
}

export function useMyReportsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.reports.mine(),
    queryFn: getMyReports,
    enabled: options?.enabled ?? true,
  });
}

export function useReportQuery(ticketId: string) {
  return useQuery({
    queryKey: queryKeys.reports.detail(ticketId),
    queryFn: () => getReport(ticketId),
    enabled: ticketId.length > 0,
  });
}
