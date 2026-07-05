export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: string;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface UnreadCount {
  unread: number;
}
