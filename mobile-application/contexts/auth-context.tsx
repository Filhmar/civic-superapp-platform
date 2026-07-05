/**
 * Auth session context — client state only (server state lives in React
 * Query). Exposes {status, user, signIn*, signOut}.
 *
 * status: 'anonymous' (no session) | 'guest' | 'resident'.
 * Startup hydrates from LOCAL storage only (scope + token presence) — never
 * blocks on the network. The resident profile refreshes in the background.
 */
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { queryKeys } from "@/constants/query-keys";
import { useProfileQuery } from "@/hooks/queries/use-profile";
import { authEvents } from "@/lib/auth-events";
import { guestLogin, logout } from "@/services/auth";
import {
  clearAuthTokens,
  getStoredScope,
  hasSession,
  storeScope,
  storeTokens,
} from "@/services/secure-storage";
import type { AuthStatus, OtpVerifyResponse, User } from "@/types/auth";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Local storage hydration finished (never a network wait). */
  hydrated: boolean;
  /** Store a verified-OTP session (tokens + user). */
  signInResident: (session: OtpVerifyResponse) => Promise<void>;
  /** Create + store a guest session. */
  signInGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("anonymous");

  // Hydrate from local storage: scope + token presence only.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [scope, session] = await Promise.all([
        getStoredScope(),
        hasSession(),
      ]);
      if (cancelled) return;
      if (session && (scope === "guest" || scope === "resident")) {
        setStatus(scope);
      } else {
        setStatus("anonymous");
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resident profile refreshes in the background via React Query.
  const profileQuery = useProfileQuery({ enabled: status === "resident" });
  const user = status === "resident" ? (profileQuery.data ?? null) : null;

  const resetSessionCaches = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
    queryClient.removeQueries({ queryKey: queryKeys.reports.mine() });
  }, [queryClient]);

  // Dead session (token-refresh emitted) → local teardown. The root layout
  // handles the redirect.
  useEffect(() => {
    return authEvents.on("unauthenticated", () => {
      resetSessionCaches();
      setStatus("anonymous");
    });
  }, [resetSessionCaches]);

  const signInResident = useCallback(
    async (session: OtpVerifyResponse) => {
      await storeTokens({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      await storeScope("resident");
      queryClient.setQueryData(queryKeys.auth.user(), session.user);
      setStatus("resident");
    },
    [queryClient],
  );

  const signInGuest = useCallback(async () => {
    const session = await guestLogin();
    await storeTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token, // "" — guests get no refresh token
    });
    await storeScope("guest");
    setStatus("guest");
  }, []);

  const signOut = useCallback(async () => {
    await logout(); // best-effort server revoke
    await clearAuthTokens();
    resetSessionCaches();
    setStatus("anonymous");
  }, [resetSessionCaches]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, hydrated, signInResident, signInGuest, signOut }),
    [status, user, hydrated, signInResident, signInGuest, signOut],
  );

  if (!hydrated) return null; // local read gate, mirrors the config provider

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
