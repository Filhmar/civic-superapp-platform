import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { updateProfile, type UpdateProfileInput } from "@/services/profile";

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.auth.user(), user);
    },
  });
}
