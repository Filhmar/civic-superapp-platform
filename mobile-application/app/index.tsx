import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { hasSession } from "@/services/secure-storage";

interface CachedState {
  onboarded: boolean;
  hasToken: boolean;
}

/**
 * Startup gate — routes on CACHED state only (onboarded flag + token
 * presence in storage). Config refresh happens in the background via
 * TenantConfigProvider; NEVER block the splash on the network.
 */
export default function Index() {
  const [state, setState] = useState<CachedState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [onboarded, hasToken] = await Promise.all([
        AsyncStorage.getItem("onboarded").catch(() => null),
        hasSession(),
      ]);
      if (!cancelled) setState({ onboarded: onboarded === "1", hasToken });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null; // local storage read only — instant, never network

  if (!state.onboarded) return <Redirect href="/(auth)/onboarding" />;

  // M0: guest browsing is allowed — after onboarding everyone lands on the
  // tabs, token or not. M1 gates authed-only flows via /(auth)/login.
  if (state.hasToken) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(tabs)" />;
}
