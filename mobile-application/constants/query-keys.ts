/**
 * Hierarchical query-key factory (STACK_BASIS §6). Single source of truth for
 * every React Query key.
 */
export const queryKeys = {
  config: {
    all: ["config"] as const,
    tenant: () => ["config", "tenant"] as const,
  },
  // Auth stubs — M1 fills these in.
  auth: {
    all: ["auth"] as const,
    user: () => ["auth", "user"] as const,
  },
} as const;
