/**
 * Theme preference (auto/light/dark), persisted; default = system
 * (STACK_BASIS §4). Applies via NativeWind's colorScheme so both `dark:`
 * variants and RN Appearance-driven UI follow.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nativewindColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "auto" | "light" | "dark";

const STORAGE_KEY = "theme-preference";

function apply(pref: ThemePreference): void {
  try {
    nativewindColorScheme.set(pref === "auto" ? "system" : pref);
  } catch {
    // never crash on theme application (e.g. static render)
  }
}

export function useTheme(): {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "auto") {
        setPreferenceState(stored);
        apply(stored);
      }
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    apply(pref);
    void AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  return { preference, setPreference };
}
