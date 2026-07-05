/**
 * Lookup from backend icon strings (lucide kebab-case names) to lucide
 * components, with a safe fallback for unknown names. Curated (instead of
 * importing lucide's full `icons` map) to keep the bundle small. Used by
 * report categories AND assistance programs — the names are PLATFORM data.
 */
import {
  Ambulance,
  CircleAlert,
  Construction,
  Dog,
  Droplets,
  Flower2,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Lightbulb,
  ShieldAlert,
  Trash2,
  WavesHorizontal,
  type LucideIcon,
} from "lucide-react-native";

const ICON_MAP: Record<string, LucideIcon> = {
  // Report categories
  construction: Construction,
  "trash-2": Trash2,
  lightbulb: Lightbulb,
  // lucide-react-native >=1.x renamed "waves" to WavesHorizontal.
  waves: WavesHorizontal,
  "waves-horizontal": WavesHorizontal,
  dog: Dog,
  "shield-alert": ShieldAlert,
  droplets: Droplets,
  // Assistance programs
  "heart-pulse": HeartPulse,
  "hand-coins": HandCoins,
  "graduation-cap": GraduationCap,
  ambulance: Ambulance,
  "flower-2": Flower2,
};

export function getReportCategoryIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? CircleAlert;
}

/** Generic alias — same curated map. */
export const getLucideIcon = getReportCategoryIcon;
