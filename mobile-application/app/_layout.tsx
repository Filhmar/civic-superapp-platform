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
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authEvents } from "@/lib/auth-events";
import { persistOptions, queryClient } from "@/lib/query-client";

// Provider tree per STACK_BASIS §16 (outer → inner).
export default function RootLayout() {
  // Fonts are bundled assets (no network) — gate per STACK_BASIS §16.
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === "dark";
  const bg = isDark ? palette["bg-dark"] : palette.bg;

  // Dead session → tear down session caches, redirect to the auth flow.
  useEffect(() => {
    return authEvents.on("unauthenticated", () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      router.replace("/(auth)/login");
    });
  }, [router]);

  if (!fontsLoaded) return null; // bundled font load — local, never network

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
                    <StatusBar style="auto" />
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
