/**
 * Tenant configuration contract (Reference §3). Single versioned JSON per tenant;
 * the mobile app boots entirely from this. Every per-LGU difference lives here — never in code.
 */

export type TenantKind = 'city' | 'municipality' | 'province' | 'region';
export type TenantStatus = 'active' | 'suspended' | 'provisioning';

export const MODULE_NAMES = [
  'egov',
  'reports311',
  'assistance',
  'sos',
  'news',
  'tourism',
  'directory',
  'transport',
  'health',
  'jobs',
] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];

export interface TenantBrandColors {
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
    colors: TenantBrandColors;
    logo: { type: 'svg' | 'image'; assets: Record<string, string> };
    slogan: string;
    executive: {
      title: string;
      name: string;
      photo: string;
      greeting: string;
    };
  };
  identifiers: { ticket_prefix: string; resident_id_prefix: string };
  geo: { centroid: [number, number]; units: string[] };
  locales: string[];
  onboarding: { title: string; body: string; bg: string; image: string }[];
  home: { mayors_corner: boolean; digital_id_promo: boolean };
  modules: Record<ModuleName, boolean>;
  integrations: { weather: string; sms: string; payments: string[] };
}

/** Tenant context resolved by the gateway and forwarded to every domain service. */
export interface TenantContext {
  tenantId: string;
  kind: TenantKind;
  status: TenantStatus;
  ticketPrefix: string;
  residentIdPrefix: string;
  modules: Record<ModuleName, boolean>;
  configVersion: number;
}

/** Payload envelope for TCP messages: every domain call is tenant-scoped. */
export interface TenantScoped<T = Record<string, never>> {
  tenant: TenantContext;
  data: T;
}
