/**
 * Hierarchical query-key factory (STACK_BASIS §6). Single source of truth for
 * every React Query key.
 */
export const queryKeys = {
  config: {
    all: ["config"] as const,
    tenant: () => ["config", "tenant"] as const,
  },
  auth: {
    all: ["auth"] as const,
    user: () => ["auth", "user"] as const,
    digitalId: () => ["auth", "digital-id"] as const,
  },
  posts: {
    all: ["posts"] as const,
    list: (filter?: object) => ["posts", "list", filter ?? {}] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => ["notifications", "list"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },
  weather: {
    all: ["weather"] as const,
  },
  reports: {
    all: ["reports"] as const,
    categories: () => ["reports", "categories"] as const,
    mine: () => ["reports", "mine"] as const,
    detail: (ticketId: string) => ["reports", "detail", ticketId] as const,
  },
} as const;
