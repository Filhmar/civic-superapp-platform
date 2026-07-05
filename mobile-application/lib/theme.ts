/**
 * Runtime theme hydration (STACK_BASIS §4, runtime-hydrated variant).
 * Maps fetched TenantConfig brand colors onto the CSS variables that
 * tailwind.config.ts references, falling back to the neutral placeholder
 * palette. Pure function — unit-testable without NativeWind.
 *
 * `--color-brand-light` (the design's --primary-light) is derived by
 * lightening primary, since the config contract doesn't carry it.
 */
import { palette } from "@/constants/colors";
import type { BrandColors } from "@/types/config";

export type ThemeVarMap = Record<`--color-${string}`, string>;

/** Mix a hex color toward white by `amount` (0..1). Returns input on parse failure. */
export function lightenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const num = Number.parseInt(m[1], 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount);
  const r = mix((num >> 16) & 0xff);
  const g = mix((num >> 8) & 0xff);
  const b = mix(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase()}`;
}

export function buildThemeVars(colors?: Partial<BrandColors>): ThemeVarMap {
  return {
    "--color-brand": colors?.primary ?? palette.brand,
    "--color-brand-dark": colors?.primaryDark ?? palette["brand-dark"],
    "--color-brand-light": colors?.primary
      ? lightenHex(colors.primary, 0.28)
      : palette["brand-light"],
    "--color-accent": colors?.accent ?? palette.accent,
    "--color-accent-deep": colors?.accentDeep ?? palette["accent-deep"],
    "--color-danger": colors?.danger ?? palette.danger,
    "--color-tint": colors?.tint ?? palette.tint,
  };
}
