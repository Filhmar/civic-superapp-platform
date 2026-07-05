export interface AdminUser {
  admin_id: string;
  email: string;
  name: string;
  role: 'platform_admin' | 'tenant_admin';
  tenant_id: string | null;
  status?: string;
  last_login_at?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  admin: AdminUser;
}

export interface Tenant {
  id: string;
  name: string;
  kind: string;
  status: string;
  bundleId: string;
}

export interface OnboardingSlide {
  title: string;
  body: string;
  bg: string;
  image: string;
}

export interface BrandColors {
  primary: string;
  primaryDark: string;
  accent: string;
  accentDeep: string;
  danger: string;
  tint: string;
}

export interface TenantConfig {
  tenant_id: string;
  app: { name: string; tagline: string };
  brand: {
    colors: BrandColors;
    logo: { type: string; assets: Record<string, string> };
    slogan: string;
    executive: { title: string; name: string; photo: string; greeting: string };
  };
  identifiers: { ticket_prefix: string; resident_id_prefix: string };
  geo: { centroid: number[]; units: string[] };
  locales: string[];
  onboarding: OnboardingSlide[];
  home: Record<string, boolean>;
  modules: Record<string, boolean>;
  integrations: { weather?: string; sms?: string; payments?: string[] };
}

export interface ConfigResponse {
  version: number;
  config: TenantConfig;
  app_min_supported_version?: string;
}

export interface ConfigHistoryEntry {
  version: number;
  created_at: string;
}

export interface TimelineEntry {
  from: string | null;
  to: string;
  actor: string;
  at: string;
  note?: string | null;
}

export interface Report311 {
  ticket_id: string;
  category: { key: string; label: string };
  department: string;
  description: string;
  photos: string[];
  geo: { lat: number; lng: number } | null;
  address?: string | null;
  status: string;
  timeline: TimelineEntry[];
  created_at: string;
}

export interface EgovApplication {
  application_id: string;
  stub_id: string;
  service: { code: string; name: string; group: string };
  status: string;
  fees: { fee: number; convenience_fee: number; total: number };
  window_no: string | null;
  ready_eta: string | null;
  timeline: TimelineEntry[];
  created_at?: string;
}

export interface AssistanceRequest {
  request_id: string;
  program: { key: string; name: string };
  office: string;
  details: string;
  checklist: { name: string; provided: boolean }[];
  status: string;
  claim_schedule: string | null;
  claim_location: string | null;
  timeline: TimelineEntry[];
  created_at?: string;
}

export interface FeedbackItem {
  id: string;
  message: string;
  contact: string | null;
  user_id: string | null;
  status: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  category: string;
  title: string;
  user_id: string | null;
  data: Record<string, unknown>;
  at: string;
}

export type PostCategory = 'ADVISORY' | 'EVENT' | 'PROGRAM' | 'GOVERNANCE' | 'TOURISM' | 'JOBS';

export const POST_CATEGORIES: PostCategory[] = [
  'ADVISORY',
  'EVENT',
  'PROGRAM',
  'GOVERNANCE',
  'TOURISM',
  'JOBS',
];
