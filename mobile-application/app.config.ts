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
type TenantVariant = {
  bundleId: string;
  appName: string;
  /** EAS project id (Expo dashboard). Per-tenant DATA — one EAS app per bundle id. */
  easProjectId?: string;
  /** EAS account/owner that owns easProjectId. */
  easOwner?: string;
  /** EAS project slug (must match the slug of easProjectId on the Expo server). */
  easSlug?: string;
};

const variantMap = variants as Record<string, TenantVariant>;
const variantKey = process.env.APP_VARIANT ?? Object.keys(variantMap)[0];
const variant = variantMap[variantKey];

if (!variant) {
  throw new Error(
    `Unknown APP_VARIANT "${variantKey}". Expected one of: ${Object.keys(variantMap).join(", ")}`,
  );
}

/**
 * Build ENVIRONMENT axis (orthogonal to tenant). Same for every tenant, so it
 * is code, not tenant data. `APP_ENV` (set per build profile in eas.json) gives
 * dev/preview builds a suffixed applicationId + name so all three install
 * side-by-side on one device. The suffix must be stripped back to the base
 * bundle id for X-Tenant-ID — see lib/tenant.ts (TENANT_ID_ENV_SUFFIXES).
 */
const ENV_BUNDLE_SUFFIX: Record<string, string> = {
  development: ".dev",
  preview: ".preview",
  production: "",
};
const ENV_NAME_SUFFIX: Record<string, string> = {
  development: " (Dev)",
  preview: " (Preview)",
  production: "",
};
const appEnv = process.env.APP_ENV ?? "production";
if (!(appEnv in ENV_BUNDLE_SUFFIX)) {
  throw new Error(
    `Unknown APP_ENV "${appEnv}". Expected one of: ${Object.keys(ENV_BUNDLE_SUFFIX).join(", ")}`,
  );
}
const bundleId = `${variant.bundleId}${ENV_BUNDLE_SUFFIX[appEnv]}`;
const appName = `${variant.appName}${ENV_NAME_SUFFIX[appEnv]}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: variant.easSlug || "civic-app",
  ...(variant.easOwner ? { owner: variant.easOwner } : {}),
  version: "1.0.0",
  // EAS Update: channels in eas.json require a runtimeVersion. Same policy for
  // every tenant (code, not tenant data); the per-tenant updates URL is derived
  // automatically from extra.eas.projectId.
  runtimeVersion: { policy: "appVersion" },
  orientation: "portrait",
  icon: "./assets/icons/icon-512.png",
  scheme: variantKey,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: "./assets/icons/icon-512-maskable.png",
      backgroundColor: "#FFFFFF",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/icons/favicon-48.png",
  },
  plugins: [
    "expo-router",
    [
      // Immersive mode: system nav bar hidden, swipe from the bottom edge
      // reveals it transiently. Behavior must be set here (build-time) — the
      // runtime setBehaviorAsync is a no-op with edgeToEdgeEnabled.
      "expo-navigation-bar",
      {
        visibility: "hidden",
        behavior: "overlay-swipe",
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/icons/icon-512.png",
        imageWidth: 200,
        resizeMode: "contain",
        // Match palette.bg / bg-dark (constants/colors.ts) EXACTLY so hiding the
        // splash shows no color step into the app's first paint.
        backgroundColor: "#F6F8F6",
        dark: { backgroundColor: "#0B1120" },
      },
    ],
    "expo-secure-store",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  // EAS Update endpoint — per-tenant DATA (derived from the variant's EAS
  // project id); `eas update` requires it explicitly on dynamic configs.
  ...(variant.easProjectId
    ? { updates: { url: `https://u.expo.dev/${variant.easProjectId}` } }
    : {}),
  extra: {
    tenantBundleId: variant.bundleId,
    ...(variant.easProjectId
      ? { eas: { projectId: variant.easProjectId } }
      : {}),
  },
});
