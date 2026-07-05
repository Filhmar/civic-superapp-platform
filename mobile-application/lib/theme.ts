/**
 * Runtime theme hydration (STACK_BASIS §4, runtime-hydrated variant).
 * Maps fetched TenantConfig brand colors onto the CSS variables that
 * tailwind.config.ts references, falling back to the neutral placeholder
 * palette. Pure function — unit-testable without NativeWind.
 */
import { palette } from "@/constants/colors";
import type { BrandColors } from "@/types/config";

export type ThemeVarMap = Record<`--color-${string}`, string>;

export function buildThemeVars(colors?: Partial<BrandColors>): ThemeVarMap {
  return {
    "--color-brand": colors?.primary ?? palette.brand,
    "--color-brand-dark": colors?.primaryDark ?? palette["brand-dark"],
    "--color-accent": colors?.accent ?? palette.accent,
    "--color-accent-deep": colors?.accentDeep ?? palette["accent-deep"],
    "--color-danger": colors?.danger ?? palette.danger,
    "--color-tint": colors?.tint ?? palette.tint,
  };
}
