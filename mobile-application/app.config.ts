import type { ConfigContext, ExpoConfig } from "expo/config";

import variants from "./tenant-variants.json";

/**
 * White-label build identity.
 *
 * Tenancy is DATA, never code: the ONLY tenant-varying build input is
 * `tenant-variants.json`. `APP_VARIANT` selects a variant; when unset we fall
 * back to the first variant declared in that data file (never a hardcoded
 * tenant name in code).
 */
type TenantVariant = { bundleId: string; appName: string };

const variantMap = variants as Record<string, TenantVariant>;
const variantKey = process.env.APP_VARIANT ?? Object.keys(variantMap)[0];
const variant = variantMap[variantKey];

if (!variant) {
  throw new Error(
    `Unknown APP_VARIANT "${variantKey}". Expected one of: ${Object.keys(variantMap).join(", ")}`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.appName,
  slug: "civic-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: variantKey,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: variant.bundleId,
  },
  android: {
    package: variant.bundleId,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    tenantBundleId: variant.bundleId,
  },
});
