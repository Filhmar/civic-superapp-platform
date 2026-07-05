import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getFaq } from "@/services/faq";

export function useFaqQuery(locale: string) {
  return useQuery({
    queryKey: queryKeys.faq.list(locale),
    queryFn: () => getFaq(locale),
    staleTime: 60 * 60 * 1000,
  });
}
