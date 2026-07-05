import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { setPlaceFavorite } from "@/services/places";
import type { Place } from "@/types/places";

/** Optimistic favorite toggle on the place detail (rolls back on error). */
export function useFavoriteMutation(placeId: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.places.detail(placeId);

  return useMutation({
    mutationFn: (favorite: boolean) => setPlaceFavorite(placeId, favorite),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<Place>(detailKey);
      if (previous) {
        queryClient.setQueryData<Place>(detailKey, { ...previous, favorite });
      }
      return { previous };
    },
    onError: (_err, _favorite, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
    },
  });
}
