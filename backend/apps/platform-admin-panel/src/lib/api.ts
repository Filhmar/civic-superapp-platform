import type {
  Admin,
  AssetContentType,
  AssistanceRequest,
  AuditItem,
  ConfigHistoryEntry,
  ConfigResponse,
  ConfirmAssetResponse,
  EgovApplication,
  FeedbackItem,
  LoginResponse,
  PresignResponse,
  ReportTicket,
  Tenant,
} from './types';

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3005';
export const API_BASE = RAW_BASE.replace(/\/+$/, '');
const V1 = `${API_BASE}/v1`;

const ACCESS_KEY = 'cpc_access_token';
const REFRESH_KEY = 'cpc_refresh_token';

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

async function parseResponse<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = body as { statusCode?: number; message?: string | string[] } | null;
    const raw = err?.message;
    const msg = Array.isArray(raw) ? raw.join('; ') : raw;
    throw new ApiError(err?.statusCode ?? res.status, msg || `Request failed (HTTP ${res.status})`);
  }
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return (body as Envelope<T>).data;
  }
  return body as T;
}

let refreshInFlight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;
  try {
    const res = await fetch(`${V1}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) return false;
    const data = await parseResponse<LoginResponse>(res);
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function forceRelogin(): never {
  clearTokens();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
  throw new ApiError(401, 'Session expired — please sign in again');
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const doFetch = (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getAccessToken();
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${V1}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();
  const isAuthRoute = path.startsWith('/admin/auth/');
  if (res.status === 401 && auth && !isAuthRoute) {
    const refreshed = await tryRefresh();
    if (!refreshed) forceRelogin();
    res = await doFetch();
    if (res.status === 401) forceRelogin();
  }
  return parseResponse<T>(res);
}

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** Resolve possibly-relative asset URLs (e.g. "/assets/...") against the API base for previews. */
export function resolveAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const AdminApi = {
  login: (email: string, password: string) =>
    api<LoginResponse>('/admin/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  logout: () => api<unknown>('/admin/auth/logout', { method: 'POST' }),
  me: () => api<Admin>('/admin/me'),

  tenants: () => api<Tenant[]>('/admin/tenants'),
  createTenant: (body: {
    id: string;
    kind: string;
    bundle_id: string;
    name: string;
    config: Record<string, unknown>;
  }) => api<{ id: string }>('/admin/tenants', { method: 'POST', body }),
  config: (tenantId: string) => api<ConfigResponse>(`/admin/tenants/${tenantId}/config`),
  configHistory: (tenantId: string) => api<ConfigHistoryEntry[]>(`/admin/tenants/${tenantId}/config/history`),
  patchBranding: (tenantId: string, branding: Record<string, unknown>) =>
    api<{ version: number }>(`/admin/tenants/${tenantId}/config/branding`, {
      method: 'PATCH',
      body: { branding },
    }),
  patchModules: (tenantId: string, modules: Record<string, boolean>) =>
    api<{ version: number }>(`/admin/tenants/${tenantId}/config/modules`, {
      method: 'PATCH',
      body: { modules },
    }),

  reports: (tenantId: string, status?: string) =>
    api<ReportTicket[]>(`/admin/tenants/${tenantId}/reports${qs({ status })}`),
  reportTransition: (tenantId: string, ticketId: string, body: { to: string; note?: string }) =>
    api<unknown>(`/admin/tenants/${tenantId}/reports/${ticketId}/transition`, { method: 'POST', body }),

  applications: (tenantId: string, status?: string) =>
    api<EgovApplication[]>(`/admin/tenants/${tenantId}/applications${qs({ status })}`),
  applicationTransition: (tenantId: string, stubId: string, body: { to: string; note?: string }) =>
    api<unknown>(`/admin/tenants/${tenantId}/applications/${stubId}/transition`, { method: 'POST', body }),

  assistance: (tenantId: string, status?: string) =>
    api<AssistanceRequest[]>(`/admin/tenants/${tenantId}/assistance${qs({ status })}`),
  assistanceTransition: (
    tenantId: string,
    requestId: string,
    body: { to: string; note?: string; claim_schedule?: string; claim_location?: string },
  ) => api<unknown>(`/admin/tenants/${tenantId}/assistance/${requestId}/transition`, { method: 'POST', body }),

  createPost: (
    tenantId: string,
    body: { title: string; body: string; category: string; hero_image?: string; pinned?: boolean },
  ) => api<unknown>(`/admin/tenants/${tenantId}/posts`, { method: 'POST', body }),
  feedback: (tenantId: string) => api<FeedbackItem[]>(`/admin/tenants/${tenantId}/feedback`),
  audit: (tenantId: string, category?: string) =>
    api<AuditItem[]>(`/admin/tenants/${tenantId}/audit${qs({ category })}`),

  users: (tenantId?: string) => api<Admin[]>(`/admin/users${qs({ tenant_id: tenantId })}`),
  createUser: (body: { email: string; password: string; name: string; role: string; tenant_id?: string }) =>
    api<Admin>('/admin/users', { method: 'POST', body }),

  presignAsset: (body: { content_type: AssetContentType; kind: 'brand'; tenant_id: string }) =>
    api<PresignResponse>('/admin/assets/presign', { method: 'POST', body }),
  confirmAsset: (mediaId: string, tenant_id: string) =>
    api<ConfirmAssetResponse>(`/admin/assets/${mediaId}/confirm`, { method: 'POST', body: { tenant_id } }),
};
