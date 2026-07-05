/**
 * Force-update gate (STACK_BASIS §12): hides the app below the backend's
 * app_min_supported_version. FAILS OPEN — unreachable config, missing
 * versions, or unparseable values all mean NO gate.
 */
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Text, View } from "react-native";

import { useTenantConfigQuery } from "@/hooks/queries/use-tenant-config";
import { compareVersions } from "@/lib/semver";

function getInstalledVersion(): string | null {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    null
  );
}

export function ForceUpdateGate() {
  const { data } = useTenantConfigQuery();
  const minVersion = data?.app_min_supported_version;
  const installed = getInstalledVersion();

  if (!minVersion || !installed) return null; // fail open
  const cmp = compareVersions(installed, minVersion);
  if (cmp === null || cmp >= 0) return null; // fail open / up to date

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-bg px-10 dark:bg-bg-dark">
      <Text className="text-center text-xl font-bold text-fg dark:text-fg-dark">
        Update required
      </Text>
      <Text className="mt-3 text-center text-sm text-fg-2 dark:text-fg-2-dark">
        This version of the app is no longer supported. Please install the
        latest update from the app store to continue.
      </Text>
    </View>
  );
}
