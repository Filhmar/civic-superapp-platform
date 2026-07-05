/**
 * Central QueryClient + AsyncStorage persister (STACK_BASIS §6).
 * Only the config query family is persisted to disk.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";

import { queryKeys } from "@/constants/query-keys";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5m
      gcTime: 30 * 60 * 1000, // 30m
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // side effects must not auto-replay
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "react-query-cache:v1",
});

/** Whitelisted query families that survive restarts. */
const PERSISTED_FAMILIES: readonly (readonly string[])[] = [queryKeys.config.all];

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister: asyncStoragePersister,
  maxAge: Infinity,
  buster: "v1", // bump on cache format breaks
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === "success" &&
      PERSISTED_FAMILIES.some((family) => query.queryKey[0] === family[0]),
  },
};
