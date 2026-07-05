import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { createAssistanceRequest } from "@/services/assistance";

export function useCreateAssistanceRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { program_key: string; details: string }) =>
      createAssistanceRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.assistance.requests(),
      });
    },
  });
}
