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

export function getTenantId(): string {
  const appId = Application.applicationId;
  if (appId && !EXPO_GO_IDS.includes(appId)) return appId;
  return ENV.TENANT_BUNDLE_ID;
}
