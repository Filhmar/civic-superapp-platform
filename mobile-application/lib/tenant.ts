/**
 * Tenant resolution: the installed bundle id IS the tenant key.
 *
 * White-label builds pin `X-Tenant-ID` from expo-application's applicationId.
 * In dev / Expo Go (applicationId unavailable or the Expo Go shell id) and on
 * web, fall back to EXPO_PUBLIC_TENANT_BUNDLE_ID. Tenancy is data, never code:
 * no tenant string ever lives in the app source.
 */
import * as Application from "expo-application";

import { ENV } from "@/constants/env";

const EXPO_GO_IDS = ["host.exp.exponent", "host.exp.Exponent"];

/**
 * Build-environment suffixes appended to the applicationId by app.config.ts so
 * dev/preview builds install side-by-side. They are NOT part of the tenant key,
 * so strip them: `com.dasmarinas.app.dev` -> `com.dasmarinas.app`. Keep in sync
 * with ENV_BUNDLE_SUFFIX in app.config.ts.
 */
const TENANT_ID_ENV_SUFFIXES = [".dev", ".preview"];

function baseTenantId(appId: string): string {
  for (const suffix of TENANT_ID_ENV_SUFFIXES) {
    if (appId.endsWith(suffix)) return appId.slice(0, -suffix.length);
  }
  return appId;
}

export function getTenantId(): string {
  const appId = Application.applicationId;
  if (appId && !EXPO_GO_IDS.includes(appId)) return baseTenantId(appId);
  return ENV.TENANT_BUNDLE_ID;
}
