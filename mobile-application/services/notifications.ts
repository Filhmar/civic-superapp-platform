import { api } from "@/services/api";
import type { AppNotification, UnreadCount } from "@/types/notifications";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const body = await api.get<Envelope<AppNotification[]>>("/v1/notifications");
  return body.data;
}

export async function getUnreadCount(): Promise<UnreadCount> {
  const body = await api.get<Envelope<UnreadCount>>(
    "/v1/notifications/unread-count",
  );
  return body.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/v1/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/v1/notifications/read-all");
}
