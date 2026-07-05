import { ENV } from "@/constants/env";

/** Resolve backend-relative asset paths (e.g. "/assets/…") to absolute URLs. */
export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${ENV.API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
