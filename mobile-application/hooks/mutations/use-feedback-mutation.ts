import { useMutation } from "@tanstack/react-query";

import { sendFeedback } from "@/services/feedback";

export function useSendFeedbackMutation() {
  return useMutation({
    mutationFn: (input: { message: string; contact?: string }) =>
      sendFeedback(input),
  });
}
