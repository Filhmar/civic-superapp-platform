/**
 * Single source of design tokens (STACK_BASIS §4).
 *
 * NEUTRAL tokens (bg / surface / fg / fg-2) are static and each has a `-dark`
 * sibling used by the NativeWind `dark:` variant (dark mode).
 *
 * BRAND tokens (brand / brand-dark / accent / accent-deep / danger / tint) are
 * runtime-hydrated from the fetched TenantConfig via CSS variables set by
 * `components/theme-provider.tsx`. The values below are ONLY neutral
 * placeholder defaults shown before the first config load.
 *
 * NAMING CAUTION: `brand-dark` is the DARKER BRAND SHADE (config
 * `brand.colors.primaryDark`), NOT the dark-mode sibling of `brand`. Same for
 * `accent-deep` (config `accentDeep`). Neutral `-dark` suffixes ARE dark-mode
 * siblings.
 */
export const palette = {
  // Neutral tokens — `-dark` = dark-mode sibling.
  bg: "#F8FAFC",
  "bg-dark": "#0B1120",
  surface: "#FFFFFF",
  "surface-dark": "#1E293B",
  fg: "#0F172A",
  "fg-dark": "#F1F5F9",
  "fg-2": "#64748B",
  "fg-2-dark": "#94A3B8",
  // Brand token placeholders — overridden at runtime from TenantConfig.
  brand: "#475569",
  "brand-dark": "#1E293B", // darker brand shade (primaryDark), not dark mode
  accent: "#94A3B8",
  "accent-deep": "#64748B", // deeper accent shade (accentDeep)
  danger: "#DC2626",
  tint: "#E2E8F0",
} as const;

export type Palette = typeof palette;
