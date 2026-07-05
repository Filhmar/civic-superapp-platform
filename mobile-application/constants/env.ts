/**
 * The ONLY place environment variables are read (STACK_BASIS §13).
 * Everything comes from `process.env.EXPO_PUBLIC_*` with a `?? default`.
 */
export const ENV = {
  /** Backend base URL. */
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3005",
  /**
   * Dev/Expo Go fallback for the tenant bundle id (X-Tenant-ID). On installed
   * white-label builds the applicationId is used instead. Empty = unresolved;
   * runtime handles it gracefully (first-launch retry screen).
   */
  TENANT_BUNDLE_ID: process.env.EXPO_PUBLIC_TENANT_BUNDLE_ID ?? "",
} as const;
