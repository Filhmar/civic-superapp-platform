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
  egov: {
    all: ["egov"] as const,
    catalog: () => ["egov", "catalog"] as const,
    applications: () => ["egov", "applications"] as const,
    application: (stubId: string) =>
      ["egov", "applications", "detail", stubId] as const,
  },
  assistance: {
    all: ["assistance"] as const,
    programs: () => ["assistance", "programs"] as const,
    requests: () => ["assistance", "requests"] as const,
    request: (id: string) => ["assistance", "requests", "detail", id] as const,
  },
  hotlines: {
    all: ["hotlines"] as const,
    list: (tag?: string) => ["hotlines", "list", tag ?? "all"] as const,
  },
  places: {
    all: ["places"] as const,
    list: (filter?: object) => ["places", "list", filter ?? {}] as const,
    detail: (id: string) => ["places", "detail", id] as const,
  },
  transport: {
    all: ["transport"] as const,
    routes: () => ["transport", "routes"] as const,
    match: (from: string, to: string) =>
      ["transport", "match", from, to] as const,
  },
  search: {
    all: ["search"] as const,
    results: (q: string) => ["search", "results", q] as const,
    recent: () => ["search", "recent"] as const,
  },
  faq: {
    all: ["faq"] as const,
    list: (locale: string) => ["faq", "list", locale] as const,
  },
  geo: {
    all: ["geo"] as const,
    boundary: () => ["geo", "boundary"] as const,
    features: (bbox: string, layer?: string) =>
      ["geo", "features", bbox, layer ?? "all"] as const,
    locate: (lat: number, lng: number) => ["geo", "locate", lat, lng] as const,
  },
} as const;
