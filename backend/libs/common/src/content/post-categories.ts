/** CMS post categories (Reference §5.6) — platform-wide, not per-tenant. */
export const POST_CATEGORIES = [
  'ADVISORY',
  'EVENT',
  'PROGRAM',
  'GOVERNANCE',
  'TOURISM',
  'JOBS',
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];
