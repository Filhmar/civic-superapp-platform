import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { uploadMedia } from "@/services/media";
import { createReport } from "@/services/reports";
import type { CreateReportInput } from "@/types/reports";

export function useCreateReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) => createReport(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.mine() });
    },
  });
}

export function useUploadMediaMutation() {
  return useMutation({
    mutationFn: (params: {
      uri: string;
      contentType: string;
      kind: "report" | "avatar";
      onProgress?: (fraction: number) => void;
    }) => uploadMedia(params),
  });
}
