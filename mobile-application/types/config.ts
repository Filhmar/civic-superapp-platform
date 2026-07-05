/**
 * Tenant configuration contract (Platform Reference §3).
 * The app boots entirely from this JSON — tenancy is data, never code.
 */

export interface BrandColors {
  primary: string;
  primaryDark: string;
  accent: string;
  accentDeep: string;
  danger: string;
  tint: string;
}

export interface BrandLogo {
  type: "svg" | "image";
  assets: {
    seal?: string;
    mascot?: string;
    watermark?: string;
  };
}

export interface BrandExecutive {
  title: string;
  name: string;
  photo: string;
  greeting: string;
}

export interface TenantBrand {
  colors: BrandColors;
  logo: BrandLogo;
  slogan: string;
  executive: BrandExecutive;
}

export interface TenantIdentifiers {
  ticket_prefix: string;
  resident_id_prefix: string;
}

export interface TenantGeo {
  /** [latitude, longitude] */
  centroid: [number, number];
  /** Barangays / districts */
  units: string[];
}

export interface OnboardingSlide {
  title: string;
  body: string;
  /** Slide background color */
  bg: string;
  image: string;
}

export interface HomeFlags {
  mayors_corner: boolean;
  digital_id_promo: boolean;
}

export type ModuleKey =
  | "egov"
  | "reports311"
  | "assistance"
  | "sos"
  | "news"
  | "tourism"
  | "directory"
  | "transport"
  | "health"
  | "jobs";

export type ModuleFlags = Record<ModuleKey, boolean>;

export interface TenantIntegrations {
  weather?: string;
  sms?: string;
  payments?: string[];
}

export interface TenantConfig {
  tenant_id: string;
  app: {
    name: string;
    tagline: string;
  };
  brand: TenantBrand;
  identifiers: TenantIdentifiers;
  geo: TenantGeo;
  locales: string[];
  onboarding: OnboardingSlide[];
  home: HomeFlags;
  modules: ModuleFlags;
  integrations: TenantIntegrations;
}

/** Envelope returned by GET /v1/config. */
export interface TenantConfigEnvelope {
  version: number;
  config: TenantConfig;
  app_min_supported_version: string;
}
