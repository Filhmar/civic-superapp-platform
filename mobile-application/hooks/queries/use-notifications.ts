import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { getNotifications, getUnreadCount } from "@/services/notifications";

export function useNotificationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotifications,
    enabled: options?.enabled ?? true,
  });
}

export function useUnreadCountQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCount,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000,
  });
}
