import type { BrandColors } from './types';

/**
 * Runtime tenant theming — the City Console's entire accent plane is derived
 * from the logged-in tenant's config.brand.colors. Every teal/orange pixel in
 * the design prototype is a function of (primary, accent); here we compute the
 * same derivations and pin them on :root as CSS custom properties so the SAME
 * stylesheet renders a green console for MyDasma and a teal one for MyLegazpi.
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Multiply each channel by (1 - f) — same helper the design prototype ships. */
export function darken(hex: string, f: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r * (1 - f), g * (1 - f), b * (1 - f));
}

/** hex → rgba() string — same helper the design prototype ships. */
export function hexA(hex: string, a: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Tint toward white: color-mix(in srgb, hex pct%, white). */
export function tint(hex: string, pct: number): string {
  const [r, g, b] = channels(hex);
  const k = pct / 100;
  return toHex(255 - k * (255 - r), 255 - k * (255 - g), 255 - k * (255 - b));
}

export interface ThemeInput {
  primary: string;
  primaryDark?: string;
  accent: string;
  accentDeep?: string;
  tint?: string;
}

/** Neutral pre-login fallback (no tenant known yet) — a desaturated slate. */
export const NEUTRAL_THEME: ThemeInput = {
  primary: '#3A4A57',
  primaryDark: '#242E36',
  accent: '#7C8894',
  accentDeep: '#636D76',
  tint: '#EBEDEE',
};

const STORAGE_KEY = 'tap_theme';

function setVars(t: ThemeInput): void {
  const root = document.documentElement.style;
  const primary = HEX_RE.test(t.primary) ? t.primary : NEUTRAL_THEME.primary;
  const accent = HEX_RE.test(t.accent) ? t.accent : NEUTRAL_THEME.accent;
  // Config values verbatim when present, spec-derived fallbacks otherwise.
  const primaryDark =
    t.primaryDark && HEX_RE.test(t.primaryDark) ? t.primaryDark : darken(primary, 0.38);
  const accentDeep =
    t.accentDeep && HEX_RE.test(t.accentDeep) ? t.accentDeep : darken(accent, 0.2);
  const primarySoft = t.tint && HEX_RE.test(t.tint) ? t.tint : tint(primary, 10);

  root.setProperty('--primary', primary);
  root.setProperty('--primary-dark', primaryDark);
  root.setProperty('--primary-soft', primarySoft);
  root.setProperty('--accent', accent);
  root.setProperty('--accent-deep', accentDeep);
  root.setProperty('--accent-soft', tint(accent, 12));

  // Alpha tints used throughout the design (never hard-coded in CSS).
  root.setProperty('--primary-a06', hexA(primary, 0.06));
  root.setProperty('--primary-a10', hexA(primary, 0.1));
  root.setProperty('--primary-a18', hexA(primary, 0.18));
  root.setProperty('--primary-a25', hexA(primary, 0.25));
  root.setProperty('--primary-a28', hexA(primary, 0.28));
  root.setProperty('--primary-a34', hexA(primary, 0.34));
  root.setProperty('--primary-a40', hexA(primary, 0.4));
  root.setProperty('--accent-a05', hexA(accent, 0.05));
  root.setProperty('--accent-a06', hexA(accent, 0.06));
  root.setProperty('--accent-a12', hexA(accent, 0.12));
  root.setProperty('--accent-a25', hexA(accent, 0.25));

  // Toast ink = darken(primary, .5) — tenant-derived, not a neutral.
  root.setProperty('--toast-bg', darken(primary, 0.5));

  // Login backdrop = radial of primary darkened 40/60/78% + accent grid.
  root.setProperty('--login-a', darken(primary, 0.4));
  root.setProperty('--login-b', darken(primary, 0.6));
  root.setProperty('--login-c', darken(primary, 0.78));

  // Modules lock-callout border ≈ 18% primary tint on white.
  root.setProperty('--callout-border', tint(primary, 18));
}

/** Apply the tenant theme and remember it for instant re-hydration on reload. */
export function applyTenantTheme(colors: Partial<BrandColors> | undefined | null): void {
  if (!colors?.primary || !HEX_RE.test(colors.primary)) return;
  const input: ThemeInput = {
    primary: colors.primary,
    primaryDark: colors.primaryDark,
    accent: colors.accent && HEX_RE.test(colors.accent) ? colors.accent : NEUTRAL_THEME.accent,
    accentDeep: colors.accentDeep,
    tint: colors.tint,
  };
  setVars(input);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
  } catch {
    /* storage unavailable — theme still applied for this page */
  }
}

/** Neutral theme (pre-login / after logout). */
export function resetTheme(): void {
  setVars(NEUTRAL_THEME);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Boot-time hydration: re-apply the last tenant theme before first paint. */
export function initTheme(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setVars({ ...NEUTRAL_THEME, ...(JSON.parse(raw) as ThemeInput) });
      return;
    }
  } catch {
    /* fall through to neutral */
  }
  setVars(NEUTRAL_THEME);
}
