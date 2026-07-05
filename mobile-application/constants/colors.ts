/**
 * Single source of design tokens (STACK_BASIS §4 + DESIGN_SPEC §2).
 *
 * NEUTRAL tokens (bg / surface / fg=ink / fg-2=muted / line) are static and
 * shared by every tenant; each has a `-dark` sibling for the dark: variant.
 *
 * BRAND tokens (brand / brand-dark / brand-light / accent / accent-deep /
 * danger / tint=mint) are runtime-hydrated from the fetched TenantConfig via
 * CSS variables set by `components/theme-provider.tsx`. The values below are
 * ONLY neutral placeholder defaults shown before the first config load.
 *
 * NAMING CAUTION: `brand-dark` is the DARKER BRAND SHADE (config
 * `brand.colors.primaryDark`), NOT the dark-mode sibling of `brand`. Same for
 * `accent-deep` (config `accentDeep`) and `brand-light` (derived
 * primary-light). Neutral `-dark` suffixes ARE dark-mode siblings.
 */
export const palette = {
  // Neutral tokens — `-dark` = dark-mode sibling.
  bg: "#F6F8F6",
  "bg-dark": "#0B1120",
  surface: "#FFFFFF",
  "surface-dark": "#1E293B",
  fg: "#1B2A20", // ink
  "fg-dark": "#F1F5F9",
  "fg-2": "#6B7C70", // muted
  "fg-2-dark": "#94A3B8",
  line: "#EAEFEA",
  "line-dark": "#334155",
  // Brand token placeholders — overridden at runtime from TenantConfig.
  brand: "#475569",
  "brand-dark": "#1E293B", // darker brand shade (primaryDark), not dark mode
  "brand-light": "#64748B", // lighter brand shade (primaryLight)
  accent: "#94A3B8",
  "accent-deep": "#64748B", // deeper accent shade (accentDeep)
  danger: "#E53935",
  tint: "#EDF1ED", // brand mint tint
} as const;

export type Palette = typeof palette;
