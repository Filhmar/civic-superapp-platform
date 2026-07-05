/**
 * Minimal semver comparison for the force-update gate.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 * Returns null when either version is unparseable (gate fails OPEN).
 */
export function compareVersions(a: string, b: string): number | null {
  const parse = (v: string): number[] | null => {
    const parts = v.trim().split(".");
    if (parts.length === 0 || parts.length > 3) return null;
    const nums = parts.map((p) => Number.parseInt(p, 10));
    if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;
    while (nums.length < 3) nums.push(0);
    return nums;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}
