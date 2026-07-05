import { useMutation } from "@tanstack/react-query";

import { requestOtp, verifyOtp } from "@/services/auth";

export function useRequestOtpMutation() {
  return useMutation({
    mutationFn: (phoneNumber: string) => requestOtp(phoneNumber),
  });
}

export function useVerifyOtpMutation() {
  return useMutation({
    mutationFn: (params: { phoneNumber: string; code: string }) =>
      verifyOtp(params),
  });
}
