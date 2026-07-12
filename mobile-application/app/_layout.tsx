import "@/global.css";

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";

import { ForceUpdateGate } from "@/components/force-update-gate";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { palette } from "@/constants/colors";
import { queryKeys } from "@/constants/query-keys";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";
import { TenantConfigProvider } from "@/contexts/tenant-config-context";
import { ThemeModeProvider, useThemeMode } from "@/contexts/theme-context";
import { authEvents } from "@/lib/auth-events";
import { persistOptions, queryClient } from "@/lib/query-client";

// Hold the native splash (bg from app.config.ts) until fonts are ready, then
// hide it — so the splash dissolves into the app instead of an abrupt cut / blank
// flash while we gate on the bundled font load. `fade` is iOS-only (v54); on
// Android the splash simply hides after `duration`. Generic + white-label-safe:
// no tenant branding runs here (config isn't loaded yet at splash time).
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 400, fade: true });

// Provider tree per STACK_BASIS §16 (outer → inner). ThemeModeProvider owns the
// effective light/dark scheme (single source of truth) and gates first paint on
// the restored preference; ThemedRoot consumes it for the whole tree.
export default function RootLayout() {
  // Fonts are bundled assets (no network) — gate per STACK_BASIS §16.
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Reveal the app (fade out the held native splash) once fonts have loaded.
  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // bundled font load — local, never network

  return (
    <ThemeModeProvider>
      <ThemedRoot />
    </ThemeModeProvider>
  );
}

function ThemedRoot() {
  // Effective scheme follows the in-app toggle (System/Light/Dark), NOT the OS
  // directly — so the nav frame, status bar, and content bg never conflict with
  // the NativeWind `dark:` variants.
  const { scheme } = useThemeMode();
  const router = useRouter();
  const isDark = scheme === "dark";
  const bg = isDark ? palette["bg-dark"] : palette.bg;

  // Dead session → tear down session caches, redirect to the auth flow.
  useEffect(() => {
    return authEvents.on("unauthenticated", () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      router.replace("/(auth)/login");
    });
  }, [router]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: bg,
      card: isDark ? palette["surface-dark"] : palette.surface,
    },
  };

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <KeyboardProvider>
        <NavigationThemeProvider value={navTheme}>
          <TenantConfigProvider>
            <ThemeProvider>
              <AuthProvider>
                <LocaleProvider>
                  <ToastProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        // Themed content bg: no white flash on screen pop.
                        contentStyle: { backgroundColor: bg },
                      }}
                    />
                    <StatusBar style={isDark ? "light" : "dark"} />
                    <ForceUpdateGate />
                  </ToastProvider>
                </LocaleProvider>
              </AuthProvider>
            </ThemeProvider>
          </TenantConfigProvider>
        </NavigationThemeProvider>
      </KeyboardProvider>
    </PersistQueryClientProvider>
  );
}
