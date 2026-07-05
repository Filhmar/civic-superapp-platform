/**
 * Token refresh manager (STACK_BASIS §9 skeleton, verbatim semantics).
 *
 * THE single most important auth rule — transient vs dead (do not collapse):
 *   - 401/403 on refresh  → DEAD session → clear tokens + emit "unauthenticated"
 *   - 429 / other / network error → TRANSIENT → keep tokens, return null,
 *     do NOT log out (offline keeps the user in-app on cached data).
 */
import { authEvents } from "@/lib/auth-events";
import { decodeJwtPayload } from "@/lib/jwt";
import { refreshToken } from "@/services/auth";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  storeTokens,
} from "@/services/secure-storage";

class TokenRefreshManager {
  private isRefreshing = false;
  private queue: ((t: string | null) => void)[] = [];
  private BUFFER = 30; // seconds

  isExpired(token: string): boolean {
    const { exp } = decodeJwtPayload<{ exp?: number }>(token) ?? {};
    if (!exp) return false; // fail safe on malformed / no-exp tokens
    return exp - Math.floor(Date.now() / 1000) < this.BUFFER;
  }

  async refreshIfNeeded(): Promise<string | null> {
    const current = await getAccessToken();
    if (current && !this.isExpired(current)) return current;
    if (this.isRefreshing) {
      // De-dupe concurrent refreshes: park callers on the queue.
      return new Promise((res) => this.queue.push(res));
    }
    this.isRefreshing = true;
    try {
      const rt = await getRefreshToken();
      if (!rt) {
        this.drain(null);
        return null; // no session — silent, not a failure
      }
      const res = await refreshToken({ refreshToken: rt });
      if (res.status >= 200 && res.status < 300 && res.data) {
        await storeTokens(res.data);
        this.drain(res.data.accessToken);
        return res.data.accessToken;
      }
      if (res.status === 401 || res.status === 403) {
        // Dead session.
        await this.fail();
        return null;
      }
      // Transient (429/5xx/etc) — keep session.
      this.drain(null);
      return null;
    } catch {
      // Offline/timeout — keep session.
      this.drain(null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private drain(t: string | null): void {
    this.queue.forEach((r) => r(t));
    this.queue = [];
  }

  private async fail(): Promise<void> {
    this.drain(null);
    await clearAuthTokens();
    authEvents.emit("unauthenticated");
  }
}

export const tokenRefreshManager = new TokenRefreshManager();
