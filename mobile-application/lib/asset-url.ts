/**
 * Brand/config asset URL policy: only absolute http(s) URLs are renderable.
 * Legacy seed configs may carry relative paths ("/assets/tenants/…") whose
 * files don't exist — treat ANY non-http(s) value as absent and fall back to
 * the placeholder/monogram rendering.
 */
export function isRenderableAssetUrl(value?: string | null): boolean {
  return (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://"))
  );
}
