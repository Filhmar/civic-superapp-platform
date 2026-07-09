/**
 * Theme preference model. `system` follows the OS; `light`/`dark` force it.
 * Persisted under AsyncStorage key "theme-preference".
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme-preference";

const VALID: readonly ThemePreference[] = ["system", "light", "dark"];

/** Coerce any stored/unknown value to a valid preference (default: system). */
export function normalizeThemePreference(value: unknown): ThemePreference {
  return VALID.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : "system";
}
