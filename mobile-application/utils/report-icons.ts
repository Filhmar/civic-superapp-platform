/**
 * Lookup from backend icon strings (lucide kebab-case names) to lucide
 * components, with a safe fallback for unknown names. Curated (instead of
 * importing lucide's full `icons` map) to keep the bundle small.
 */
import {
  CircleAlert,
  Construction,
  Dog,
  Droplets,
  Lightbulb,
  ShieldAlert,
  Trash2,
  WavesHorizontal,
  type LucideIcon,
} from "lucide-react-native";

const ICON_MAP: Record<string, LucideIcon> = {
  construction: Construction,
  "trash-2": Trash2,
  lightbulb: Lightbulb,
  // lucide-react-native >=1.x renamed "waves" to WavesHorizontal.
  waves: WavesHorizontal,
  "waves-horizontal": WavesHorizontal,
  dog: Dog,
  "shield-alert": ShieldAlert,
  droplets: Droplets,
};

export function getReportCategoryIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? CircleAlert;
}
