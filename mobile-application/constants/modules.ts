/**
 * PLATFORM module metadata — generic labels/icons/tones, identical for every
 * tenant. Whether a module is enabled comes from the fetched TenantConfig
 * (`config.modules`), never from here. Tenancy is data, never code.
 */
import {
  BookUser,
  BriefcaseBusiness,
  Bus,
  FileText,
  HeartHandshake,
  MapPin,
  Megaphone,
  Newspaper,
  Siren,
  Stethoscope,
  type LucideIcon,
} from "lucide-react-native";

import type { ModuleKey } from "@/types/config";

/**
 * DESIGN_SPEC §4 tile tint families. `brand` uses the runtime tenant tint +
 * primary; the rest are fixed platform pastels with saturated icon colors.
 */
export type ModuleTone = "brand" | "red" | "gold" | "blue" | "purple";

export interface ToneChip {
  bg: string;
  icon: string;
}

/** Every chip has a dark-mode sibling (single-palette theming rule). */
export const TONE_COLORS: Record<
  Exclude<ModuleTone, "brand">,
  { light: ToneChip; dark: ToneChip }
> = {
  red: {
    light: { bg: "#FDEDEC", icon: "#E53935" },
    dark: { bg: "#3B1D1E", icon: "#FF8A80" },
  },
  gold: {
    light: { bg: "#FEF3D9", icon: "#D4A017" },
    dark: { bg: "#3A2F17", icon: "#FFD54F" },
  },
  blue: {
    light: { bg: "#E8F1FA", icon: "#2274A5" },
    dark: { bg: "#16293B", icon: "#82B6DD" },
  },
  purple: {
    light: { bg: "#F1ECFA", icon: "#7E57C2" },
    dark: { bg: "#2A2140", icon: "#B39DDB" },
  },
};

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  tone: ModuleTone;
}

export const MODULES: readonly ModuleMeta[] = [
  { key: "egov", label: "Gov Services", icon: FileText, tone: "brand" },
  { key: "reports311", label: "Report", icon: Megaphone, tone: "red" },
  { key: "assistance", label: "Assistance", icon: HeartHandshake, tone: "gold" },
  { key: "sos", label: "SOS", icon: Siren, tone: "red" },
  { key: "news", label: "News", icon: Newspaper, tone: "brand" },
  { key: "tourism", label: "Tourism", icon: MapPin, tone: "gold" },
  { key: "directory", label: "Directory", icon: BookUser, tone: "purple" },
  { key: "transport", label: "Transport", icon: Bus, tone: "blue" },
  { key: "health", label: "Health", icon: Stethoscope, tone: "red" },
  { key: "jobs", label: "Jobs", icon: BriefcaseBusiness, tone: "brand" },
] as const;

/**
 * Routes for modules that have screens. Modules enabled in config but not yet
 * built route nowhere (the UI shows an "opening soon" toast instead — it must
 * never call a disabled module's endpoint). health/jobs are config-disabled
 * for current tenants and stay "coming soon".
 */
export const MODULE_ROUTES: Partial<Record<ModuleKey, string>> = {
  egov: "/services",
  reports311: "/report",
  assistance: "/assistance",
  sos: "/sos",
  news: "/news",
  tourism: "/tourism",
  directory: "/directory",
  transport: "/transport",
};
