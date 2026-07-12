/** Usapp 404 — the number holds no registered Usapp account. Expected, user-actionable. */
export class RecipientNotRegisteredError extends Error {}
/** Usapp 429 — per-second/-minute rate limit or monthly quota exhausted. */
export class DeliveryRateLimitedError extends Error {}
/** 401/403/400/5xx/timeout/network — misconfig or transient upstream fault. */
export class DeliveryUnavailableError extends Error {}
