/**
 * Runtime theme hydration (STACK_BASIS §4): sets the --color-* CSS variables
 * that tailwind.config.ts brand tokens reference, from the fetched
 * TenantConfig brand colors (placeholder palette defaults until loaded).
 */
import { vars } from "nativewind";
import { useMemo, type ReactNode } from "react";
import { View } from "react-native";

import { useTenantConfig } from "@/contexts/tenant-config-context";
import { buildThemeVars } from "@/lib/theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { config } = useTenantConfig();
  const themeVars = useMemo(
    () => vars(buildThemeVars(config?.brand.colors)),
    [config],
  );
  return <View style={[{ flex: 1 }, themeVars]}>{children}</View>;
}
