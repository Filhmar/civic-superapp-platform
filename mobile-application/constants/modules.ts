/**
 * PLATFORM module metadata — generic labels/icons, identical for every tenant.
 * Whether a module is enabled comes from the fetched TenantConfig
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

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
}

export const MODULES: readonly ModuleMeta[] = [
  { key: "egov", label: "e-Services", icon: FileText },
  { key: "reports311", label: "Report", icon: Megaphone },
  { key: "assistance", label: "Assistance", icon: HeartHandshake },
  { key: "sos", label: "SOS", icon: Siren },
  { key: "news", label: "News", icon: Newspaper },
  { key: "tourism", label: "Tourism", icon: MapPin },
  { key: "directory", label: "Directory", icon: BookUser },
  { key: "transport", label: "Transport", icon: Bus },
  { key: "health", label: "Health", icon: Stethoscope },
  { key: "jobs", label: "Jobs", icon: BriefcaseBusiness },
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
