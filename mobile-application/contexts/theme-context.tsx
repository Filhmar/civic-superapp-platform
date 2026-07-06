/**
 * Owns the app's light/dark mode. NativeWind's colorScheme is the single
 * source of truth (drives `dark:` variants AND, via useThemeMode().scheme,
 * the navigation frame / status bar / content bg in _layout). Restores the
 * persisted preference at startup and blocks first paint until it is applied,
 * so there is no flash of the wrong theme.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  normalizeThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme-mode";

interface ThemeModeValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  scheme: "light" | "dark";
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  // null = still restoring persisted preference (startup gate).
  const [preference, setPreferenceState] = useState<ThemePreference | null>(
    null,
  );

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      const pref = normalizeThemePreference(stored);
      setColorScheme(pref); // 'system' | 'light' | 'dark'
      setPreferenceState(pref);
    });
  }, [setColorScheme]);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setColorScheme(pref);
      setPreferenceState(pref);
      void AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    },
    [setColorScheme],
  );

  if (preference === null) return null; // no flash of wrong theme

  return (
    <ThemeModeContext.Provider
      value={{ preference, setPreference, scheme: colorScheme ?? "light" }}
    >
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    // Defensive default so a stray consumer never crashes (e.g. static render).
    return { preference: "system", setPreference: () => {}, scheme: "light" };
  }
  return ctx;
}
