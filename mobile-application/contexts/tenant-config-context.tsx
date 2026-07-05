/**
 * Tenant config provider — config-driven boot, cached-first.
 *
 * 1. Hydrates the last-known config from AsyncStorage ('tenant-config:v1')
 *    BEFORE first paint (renders null while the local read completes — this is
 *    a storage read, never the network, per the cached-session startup rule).
 * 2. Kicks a background React Query fetch that updates state + re-persists.
 * 3. First launch only (no cache) with a failed fetch → minimal retry screen.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useTenantConfigQuery } from "@/hooks/queries/use-tenant-config";
import { buildThemeVars } from "@/lib/theme";
import type { TenantConfig } from "@/types/config";

const CACHE_KEY = "tenant-config:v1";

export type TenantConfigStatus = "loading" | "ready" | "error";

interface TenantConfigContextValue {
  config: TenantConfig | null;
  status: TenantConfigStatus;
  retry: () => void;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(null);

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  // (a) Synchronous-feeling hydration gate: null until the LOCAL storage read
  // completes (mirrors the §16 font gate — local, never network).
  const [hydrated, setHydrated] = useState(false);
  const [cachedConfig, setCachedConfig] = useState<TenantConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setCachedConfig(JSON.parse(raw) as TenantConfig);
          } catch {
            // Corrupt cache — treat as first launch.
          }
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // (b) Background refresh — NEVER blocks startup.
  const query = useTenantConfigQuery();
  const fetchedConfig = query.data?.config ?? null;

  useEffect(() => {
    if (fetchedConfig) {
      setCachedConfig(fetchedConfig);
      void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(fetchedConfig));
    }
  }, [fetchedConfig]);

  const config = fetchedConfig ?? cachedConfig;

  const status: TenantConfigStatus = config
    ? "ready"
    : query.isError
      ? "error"
      : "loading";

  const value = useMemo<TenantConfigContextValue>(
    () => ({ config, status, retry: () => void query.refetch() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, status],
  );

  if (!hydrated) return null; // gate on the local storage read only

  return (
    <TenantConfigContext.Provider value={value}>
      {config ? (
        children
      ) : status === "error" ? (
        <FirstLaunchRetry onRetry={value.retry} />
      ) : (
        <FirstLaunchLoading />
      )}
    </TenantConfigContext.Provider>
  );
}

export function useTenantConfig(): TenantConfigContextValue {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) {
    throw new Error("useTenantConfig must be used within TenantConfigProvider");
  }
  return ctx;
}

// These screens render OUTSIDE ThemeProvider (no config yet), so they carry
// their own placeholder-theme var scope.
const placeholderVars = vars(buildThemeVars());

/** First launch only: no cached config yet, fetch in flight. */
function FirstLaunchLoading() {
  return (
    <View
      style={[{ flex: 1 }, placeholderVars]}
      className="items-center justify-center bg-bg dark:bg-bg-dark"
    >
      <ActivityIndicator size="large" />
    </View>
  );
}

/** First launch only: no cached config and the network failed. */
function FirstLaunchRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={[{ flex: 1 }, placeholderVars]}
      className="items-center justify-center gap-4 bg-bg px-8 dark:bg-bg-dark"
    >
      <Text className="text-center text-lg font-semibold text-fg dark:text-fg-dark">
        Unable to connect
      </Text>
      <Text className="text-center text-sm text-fg-2 dark:text-fg-2-dark">
        We could not reach the server to set up the app. Check your connection
        and try again.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        className="rounded-full bg-brand px-8 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}
