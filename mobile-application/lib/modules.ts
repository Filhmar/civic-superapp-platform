/**
 * Module-grid derivation: merge PLATFORM module metadata with the tenant's
 * runtime `config.modules` flags, and resolve tile chip colors per color
 * scheme. Pure — unit-testable.
 */
import { palette } from "@/constants/colors";
import {
  MODULES,
  TONE_COLORS,
  type ModuleMeta,
  type ModuleTone,
  type ToneChip,
} from "@/constants/modules";
import { lightenHex } from "@/lib/theme";
import type { ModuleFlags } from "@/types/config";

export interface ModuleTile extends ModuleMeta {
  /** From the tenant config; missing/absent flags mean disabled. */
  enabled: boolean;
}

export function deriveModuleTiles(
  flags: Partial<ModuleFlags> | undefined,
): ModuleTile[] {
  return MODULES.map((meta) => ({
    ...meta,
    enabled: flags?.[meta.key] === true,
  }));
}

/** Disabled ("Soon") tile treatment — readable in both schemes. */
export const DISABLED_TILE: { light: ToneChip; dark: ToneChip } = {
  light: { bg: palette.line, icon: palette["fg-2"] },
  dark: { bg: palette["line-dark"], icon: palette["fg-2-dark"] },
};

/**
 * Chip colors for a module tile. `brand` derives from the runtime tenant
 * primary/tint (tenancy is data, never code); fixed tones use their
 * light/dark siblings.
 */
export function resolveToneColors(
  tone: ModuleTone,
  scheme: "light" | "dark",
  primary: string,
  tint: string,
): ToneChip {
  if (tone === "brand") {
    return scheme === "dark"
      ? { bg: `${primary}33`, icon: lightenHex(primary, 0.45) }
      : { bg: tint, icon: primary };
  }
  return TONE_COLORS[tone][scheme];
}
