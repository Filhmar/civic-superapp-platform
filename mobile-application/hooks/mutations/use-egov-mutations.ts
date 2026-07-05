import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { createApplication, payApplication } from "@/services/egov";
import type { CreateApplicationInput, PaymentMethod } from "@/types/egov";

export function useCreateApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => createApplication(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.egov.applications(),
      });
    },
  });
}

export function usePayApplicationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      applicationId: string;
      method: PaymentMethod;
      idempotencyKey: string;
    }) => payApplication(params),
    onSuccess: (result) => {
      queryClient.setQueryData(
        queryKeys.egov.application(result.application.stub_id),
        result.application,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.egov.applications(),
      });
    },
  });
}
