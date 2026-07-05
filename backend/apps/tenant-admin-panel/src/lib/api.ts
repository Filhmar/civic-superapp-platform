import type { AdminUser, LoginResponse } from './types';

const BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3005';
const V1 = `${BASE}/v1`;

const ACCESS_KEY = 'tap_access_token';
const REFRESH_KEY = 'tap_refresh_token';

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (Array.isArray(m)) return m.join('; ');
    if (typeof m === 'string') return m;
  }
  return fallback;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Deduplicated silent refresh. Returns true when a new token pair was stored. */
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${V1}/admin/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const body = (await parseJson(res)) as {
          data?: { access_token?: string; refresh_token?: string };
        } | null;
        const data = body?.data;
        if (!data?.access_token || !data.refresh_token) return false;
        setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function forceRelogin(): never {
  clearTokens();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
  throw new ApiError(401, 'Session expired — please sign in again');
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** attach Bearer token (default true) */
  auth?: boolean;
  /** internal: prevents more than one refresh+retry */
  _isRetry?: boolean;
}

/** Calls the admin API, unwraps the {success,data} envelope, and handles 401 refresh. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, _isRetry = false } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${V1}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Network error — is the backend reachable?');
  }

  if (res.status === 401 && auth && !_isRetry && !path.startsWith('/admin/auth/')) {
    const refreshed = await tryRefresh();
    if (!refreshed) forceRelogin();
    return api<T>(path, { ...options, _isRetry: true });
  }

  const parsed = await parseJson(res);

  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(parsed, `Request failed (${res.status})`));
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    return (parsed as { data: T }).data;
  }
  return parsed as T;
}

// ---- auth ----

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await api<LoginResponse>('/admin/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  setTokens(data.access_token, data.refresh_token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await api('/admin/auth/logout', { method: 'POST' });
  } catch {
    // best effort — clear locally regardless
  }
  clearTokens();
}

export function fetchMe(): Promise<AdminUser> {
  return api<AdminUser>('/admin/me');
}

// ---- assets ----

export const UPLOAD_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

interface PresignResponse {
  media_id: string;
  upload_url: string;
  max_bytes: number;
}

/** presign -> PUT raw bytes -> confirm; resolves to the public URL. */
export async function uploadAsset(file: File, tenantId: string): Promise<string> {
  if (!UPLOAD_CONTENT_TYPES.includes(file.type)) {
    throw new ApiError(415, `Unsupported file type "${file.type || 'unknown'}" — use PNG, JPEG, WebP or SVG`);
  }
  const presign = await api<PresignResponse>('/admin/assets/presign', {
    method: 'POST',
    body: { content_type: file.type, kind: 'brand', tenant_id: tenantId },
  });
  if (file.size > presign.max_bytes) {
    throw new ApiError(413, `File too large (max ${(presign.max_bytes / 1024 / 1024).toFixed(1)} MB)`);
  }
  const put = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!put.ok) {
    throw new ApiError(put.status, 'Upload to object storage failed');
  }
  const confirmed = await api<{ url: string }>(`/admin/assets/${presign.media_id}/confirm`, {
    method: 'POST',
    body: { tenant_id: tenantId },
  });
  return confirmed.url;
}
