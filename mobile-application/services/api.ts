/**
 * API layer — one client, two call styles (STACK_BASIS §7).
 *
 * - `apiClient` directly: when the caller must inspect 4xx status codes.
 * - `api.get/post/...`: thin wrappers that REJECT on 4xx for
 *   single-success-path callers.
 *
 * Layering: component → query/mutation hook → service fn → api/apiClient.
 * UI never imports axios.
 */
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import { ENV } from "@/constants/env";
import { tokenRefreshManager } from "@/lib/token-refresh";
import { getTenantId } from "@/lib/tenant";

/** Routes that never carry an Authorization header. */
const PUBLIC_PATHS = [
  "/token/refresh",
  "/auth/refresh",
  "/login",
  "/otp/request",
  "/otp/verify",
  "/config",
  "/auth/guest",
];

function isPublicPath(url?: string): boolean {
  return PUBLIC_PATHS.some((p) => url?.includes(p));
}

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 30000,
  headers: { Accept: "application/json", "X-Client-Type": "mobile" },
  // Never throw on status — let the interceptor/wrappers decide. Lets business
  // 4xx (e.g. 403 new-device, 404 not-found) be inspected via response.data.
  validateStatus: () => true,
});

// REQUEST: pin X-Tenant-ID on EVERY request; proactively refresh + attach the
// access token for non-public routes; fix FormData content type.
apiClient.interceptors.request.use(async (config) => {
  const tenantId = getTenantId();
  if (tenantId) config.headers["X-Tenant-ID"] = tenantId;

  // Dev-only: skip ngrok's free-tier browser interstitial when the gateway is
  // tunneled to a physical device. Stripped from production builds (__DEV__).
  if (__DEV__) config.headers["ngrok-skip-browser-warning"] = "true";

  if (!isPublicPath(config.url)) {
    const token = await tokenRefreshManager.refreshIfNeeded();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    // Let axios set the multipart boundary.
    config.headers["Content-Type"] = undefined;
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

// RESPONSE: 401 → one silent refresh + replay (non-public only); >=500 →
// reject; network error → warn + reject { status: 0 }.
apiClient.interceptors.response.use(
  async (response) => {
    const cfg = response.config as AxiosRequestConfig & { _isRetry?: boolean };
    if (
      response.status === 401 &&
      !isPublicPath(response.config?.url) &&
      !cfg._isRetry
    ) {
      cfg._isRetry = true;
      const fresh = await tokenRefreshManager.refreshIfNeeded();
      if (fresh) {
        cfg.headers = { ...cfg.headers, Authorization: `Bearer ${fresh}` };
        return apiClient(cfg);
      }
      return Promise.reject({ status: 401, message: "Session expired." });
    }
    if (response.status >= 500) {
      return Promise.reject({ status: response.status, message: "Server error" });
    }
    return response;
  },
  async (error) => {
    // warn, not error — offline is expected.
    console.warn("[API] Network error:", error?.message);
    return Promise.reject({ status: 0, message: "Network error." });
  },
);

export interface ApiError {
  status: number;
  message: string;
  data?: unknown;
}

function unwrap<T>(response: AxiosResponse<T>): T {
  if (response.status >= 400) {
    const body = response.data as { message?: string } | undefined;
    throw {
      status: response.status,
      message: body?.message ?? `Request failed (${response.status})`,
      data: response.data,
    } satisfies ApiError;
  }
  return response.data;
}

/** Thin wrappers — reject on 4xx; use for single-success-path callers. */
export const api = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(await apiClient.get<T>(url, config));
  },
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return unwrap<T>(await apiClient.post<T>(url, data, config));
  },
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return unwrap<T>(await apiClient.put<T>(url, data, config));
  },
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return unwrap<T>(await apiClient.patch<T>(url, data, config));
  },
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap<T>(await apiClient.delete<T>(url, config));
  },
};
