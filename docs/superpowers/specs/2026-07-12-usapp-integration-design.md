# Usapp integration — OTP delivery + push fan-out

**Date:** 2026-07-12
**Branch/worktree:** `worktree-usapp-integration` (in `.claude/worktrees/usapp-integration`)
**Status:** Approved design → ready for implementation plan
**Sources:** `USAPP-INTEGRATION-GUIDE.md`, `USAPP-API-DOCS.yaml` / `.json` (Usapp tenant API)

## 1. Problem & intent

Integrate **Usapp** (`app.usapp.ph`) as the delivery channel for:

1. **OTP verification** — the login code is delivered to the citizen's Usapp account.
2. **Push notifications** — in-app notifications are also fanned out to the citizen's Usapp account.

### The load-bearing fact about Usapp

Usapp's `POST /api/v1/messages/send` is **not an SMS gateway and not FCM/Expo push**. It resolves
`recipientPhone` to a **registered Usapp account** and delivers an in-app message. A number with no
Usapp account returns **`404`**. Consequences that shape this design:

- Recipient must have Usapp installed + registered with that phone number, or delivery `404`s.
- The civic platform is **one Usapp tenant** — a single `USAPP_API_KEY` and a single IP allowlist.
  This is **platform infrastructure, not per-LGU config.** (WHICH civic tenant uses Usapp for push
  is still per-tenant config; the credential is not.)
- **Dev/localhost egress is not on Usapp's IP allowlist → every real call is `403`.** Dev therefore
  keeps a `mock` channel; only staging/prod with a registered egress IP can actually send.

## 2. Decisions (from brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | OTP channel | **Usapp sole channel in prod, `mock` in dev.** No SMS fallback. `404` → user-actionable "register on Usapp first". |
| 2 | Push scope | **Mirror all** `notifications.create` to Usapp, **best-effort**, **gated per-tenant** (`integrations.push`). No caller changes. |
| 3 | Driver placement | **`integration-service` owns the Usapp driver.** Exposes RPC `integration.usapp.send`; identity + notification call it. Secret + allowlist + rate-limit centralized in one service. |
| 4 | Task scope | **Backend + mobile copy/errors.** No mobile push-token registration (push is server-side). |

## 3. Current-state baseline (what exists today)

- **OTP** — `identity.otp.request` → `OtpService.request()` generates a code, **persists** (bcrypt hash,
  Postgres `OtpRequest`), then calls `SmsProvider.sendOtp(phone, code, provider)`. `SmsProvider`
  (`apps/identity-service/src/services/sms.provider.ts`) is mock-or-throw; `provider` is
  `config.integrations.sms`. Phone format enforced: `^\+639\d{9}$` (a subset of Usapp's `^\+63\d{10}$`).
- **Notifications** — `notifications.create` (`apps/notification-service`) stores an in-app doc in Mongo
  + an append-only audit event. **No outbound delivery exists today.** Services (egov, reports,
  assistance, SOS) dispatch fire-and-forget via `notifications.create` RPC. Mobile pulls via
  `notifications.list`. `Notification`/`User` link by `userId`; the phone lives on identity's
  `User.phoneNumber` (unique per tenant), **not** on the notification.
- **integration-service** — exists for external 3rd-party APIs (weather/AQI). Has
  `integration.controller.ts`, `weather.service.ts`. This is where the Usapp driver belongs.
- **Cross-service RPC** — pattern: a `ClientProxy` provider built with `config.tcpEndpoint(<name>)`
  (see `egov.module.ts` `NOTIFICATION_CLIENT`). Callers `.send({ cmd }, payload)`.
- **Config** — `libs/common/src/config/config.schema.ts` (Zod env). `SMS_PROVIDER: enum(mock|semaphore)`.
  Tenant config `libs/common/src/tenant/tenant-config.schema.ts` has `integrations: { weather, sms, payments }`.
- **Tenant context propagation (verified)** — `TenantContext` (in `tenant-config.types.ts`) is built by
  `tenancy.resolve` (`apps/tenancy-service/src/services/tenancy.service.ts`) from the latest config row,
  cached ~15s in Redis by the gateway `TenantMiddleware`, and forwarded on every `TenantScoped` RPC
  envelope. It currently carries `modules` (mapped from `config.modules`) + prefixes + `configVersion`
  **but NOT `integrations`.** Notifiers forward the same `tenant` object they hold to
  `notifications.create` (verified in `egov.service.ts` `notify()` → `{ tenant, data }`). This is the
  channel used to deliver the per-tenant push flag to notification-service **without any extra RPC**.

## 4. Architecture

```
  mobile ──/v1/auth/otp/request──▶ api-gateway ──rpc──▶ identity.otp.request
                                                            │  OtpService
                                                            │   (dev)  OtpDelivery=mock → log
                                                            │   (prod) OtpDelivery=usapp
                                                            ▼
  egov/reports/assistance/sos ──rpc──▶ notification.create   integration.usapp.send ──HTTP──▶ Usapp
   (forwards tenant ctx)                  │ store (always)         ▲
                                          │ if tenant.pushChannel  │ (one owner: driver + errors)
                                          │    === 'usapp':        │
                                          │  resolve phone ───rpc──┘ (identity.phone.resolve)
                                          ▼  integration.usapp.send  (best-effort)
```

`integration-service` is the **sole** holder of `USAPP_API_KEY`. The driver translates HTTP status →
domain error; the RPC boundary re-encodes domain error → `rpcError(409|503|502)` so callers stay
transport-agnostic.

## 5. Components & changes

### 5.1 `integration-service` — Usapp driver (new)

- **`usapp.driver.ts`** — port of the guide's reference driver. `fetch` to
  `${USAPP_BASE_URL}/api/v1/messages/send`, headers `content-type` + `x-api-key`, body
  `{ recipientPhone, content, format: "plain" }`, `signal: AbortSignal.timeout(USAPP_TIMEOUT_MS)`.
  **Three invariants:** never log `content` (it carries the OTP), **never retry**, always time out.
  Logs a **masked** phone only. Status mapping:
  | HTTP | outcome |
  |---|---|
  | `201` | ok (return) |
  | `404` | `RecipientNotRegisteredError` (expected; not logged as fault) |
  | `429` | `DeliveryRateLimitedError` (warn) |
  | `401/403/400/5xx/timeout/network` | `DeliveryUnavailableError` (error, naming allowlist/key causes) |
- **`integration.usapp.send`** RPC (`{ phone: string; content: string }`) — calls the driver, maps
  domain error → `rpcError(409)` (not registered) / `rpcError(503)` (rate limited) / `rpcError(502)`
  (unavailable). `201` → `{ delivered: true }`.
- Module wiring: register the driver; no new client needed (integration is the leaf).

### 5.2 `identity-service` — OTP delivery via Usapp

- **Refactor `SmsProvider` → `OtpDelivery`** (rename file/class; keep it as the OTP delivery port).
  Two modes, chosen by env, not per-tenant (decision #1 = sole channel):
  - `mock` (dev): log the code (existing behavior).
  - `usapp` (prod): call `integration.usapp.send` via a new `INTEGRATION_CLIENT` ClientProxy.
  Selection is driven **solely** by the `OTP_DELIVERY_DRIVER` env var (not `NODE_ENV`, not per-tenant);
  the `superRefine` guard (§5.4) forbids `mock` under `NODE_ENV=production`. The existing `SMS_PROVIDER`
  env, tenant `integrations.sms`, and the `sms_provider` param threaded through `identity.otp.request`
  become **vestigial for OTP** and are left untouched (removing them is out of scope / extra risk).
- **`OtpService.request` — invert to send-before-persist** (guide §8): generate code → `OtpDelivery.send`
  → **on success** persist the hashed `OtpRequest` → return `expires_in` (+ `dev_code` in dev). On
  delivery failure, **persist nothing** and surface the `rpcError` (409/503/502). This prevents dead
  rows for citizens with no Usapp account and matches the guide's ordering rule.
- Delivery errors propagate as `rpcError` so the gateway returns 409/503/502 to mobile.
- Add `INTEGRATION_CLIENT` provider to `identity.module.ts` (mirror `egov.module.ts`).
- **New RPC `identity.phone.resolve`** (`{ user_id } → { phone_number: string | null }`) for
  notification-service to look up a recipient's phone. Returns `null` for guests / no phone.

### 5.3 `notification-service` — push fan-out

- `create()` stores the in-app doc **always** (unchanged, in-app must never depend on Usapp).
- After storing, **if `p.tenant.pushChannel === 'usapp'`**: resolve phone via `identity.phone.resolve`,
  then `integration.usapp.send` **best-effort** — `.subscribe`/try-catch that **logs and swallows** every
  failure (incl. `404`); it must never fail or delay the in-app write. Skip entirely when phone is `null`
  (guest).
- Add `INTEGRATION_CLIENT` + `IDENTITY_CLIENT` ClientProxy providers to `notification.module.ts`.
- **Gating mechanism (verified):** the push flag reaches notification-service on the `TenantContext`
  envelope it already receives — **no config lookup RPC**. This requires a new field
  `pushChannel: 'usapp' | 'none'` on `TenantContext`, populated in `tenancy.resolve`
  (`pushChannel: config.integrations.push`, alongside the existing `modules` mapping). It then flows
  through the gateway's Redis-cached context and every notifier's forwarded `tenant` (e.g. `egov.notify`).
  Cache TTL ~15s ⇒ a config change to `integrations.push` takes effect within ~15s.

### 5.4 `@app/common` — config & tenant config

- **`config.schema.ts`** — add:
  - `USAPP_BASE_URL: z.url().optional()`
  - `USAPP_API_KEY: z.string().optional()` (secret)
  - `USAPP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000)`
  - `OTP_DELIVERY_DRIVER: z.enum(['mock','usapp']).default('mock')`
  - `superRefine` fail-fast: if `OTP_DELIVERY_DRIVER==='usapp'` then `USAPP_BASE_URL` + `USAPP_API_KEY`
    are required; and `mock` must not be the effective OTP driver under `NODE_ENV==='production'`.
- **`tenant-config.schema.ts`** — extend `integrations` with `push: z.enum(['usapp','none'])`
  (default/seed `'none'`). Update the `TenantConfig` type in `tenant-config.types.ts` and the **three
  tenant seeds** (MyDasma, MySorsogon, MyLegazpi) — all `'none'` initially (no code branch; pure data).
- **`tenant-config.types.ts` `TenantContext`** — add `pushChannel: 'usapp' | 'none'`.
- **`tenancy.service.ts` `resolve()`** — map it into the context: `pushChannel: config.integrations.push`
  (next to the existing `modules:` line). Update `tenancy.service.spec.ts` expectations.
- **`.env.example`** — add `USAPP_BASE_URL=https://app.usapp.ph`, `USAPP_API_KEY=` (empty),
  `USAPP_TIMEOUT_MS=5000`, `OTP_DELIVERY_DRIVER=mock`. **Real `.env*` files are never touched by the
  implementation** — the operator adds the live key.

### 5.5 Mobile — copy + error handling only

- OTP request/verify screen: copy → "We sent your code to your **Usapp** app."
- Handle the new **`409`** (not registered on Usapp) with actionable UI: "That number isn't on Usapp
  yet. Install Usapp, register this number, then request your code." Map `503`/`502` to the existing
  transient "try again" copy.
- Keep `dev_code` surfacing in dev.
- **No** device-push-token work (Usapp push is entirely server-side).
- Follows mobile layering: service fn → hook → screen; UI never imports axios. Read Expo v54 docs
  before touching mobile code (per `mobile-application/AGENTS.md`).

## 6. Error-handling contract

| Usapp | driver domain error | OTP caller (identity) | Push caller (notification) |
|---|---|---|---|
| `201` | — (ok) | persist + proceed | done |
| `404` | `RecipientNotRegistered` | `rpcError(409)` → mobile "register on Usapp" | skip + log (no account) |
| `429` | `RateLimited` | `rpcError(503)` "busy, retry" | swallow + warn |
| `401/403/400/5xx/timeout` | `Unavailable` | `rpcError(502)` | swallow + warn |

- **No retry** anywhere (guide §6 invariant): user-triggered + double-send risk on timeout.
- **5s timeout** on every call.
- **Never log** the OTP code / message content; log a **masked** phone only.
- **Push never breaks the in-app notification** — the Mongo write is the source of truth.

## 7. Security & ops checklist (from guide §9)

- [ ] `USAPP_API_KEY` is env/secret only — never in git, never logged. `.env.example` ships empty.
- [ ] Key scoped minimally (`messages:send`) — provisioning is operator-side, out of repo scope.
- [ ] Server egress IP / CIDR is in the Usapp tenant `ipAllowlist` (the #1 first-deploy failure).
- [ ] Boot **fails fast** if `OTP_DELIVERY_DRIVER=usapp` without `USAPP_BASE_URL` + `USAPP_API_KEY`.
- [ ] `mock` can never be the effective OTP channel under `NODE_ENV=production`.
- [ ] Driver **times out** and **never retries**; logs carry a masked phone, never the code.
- [ ] OTP codes remain hashed (bcrypt), single-use, attempt-capped, short TTL, rate-limited (unchanged).

## 8. Testing / verification

- **Unit — `UsappDriver`** (mocked `fetch`): each status → correct domain error; assert no-retry,
  timeout wiring, and that `content` is never passed to the logger.
- **identity OTP spec**: mock path unchanged; **send-before-persist** ordering (no `OtpRequest` row when
  delivery throws); `404`→`409` mapping; dev still returns `dev_code`.
- **notification push**: gated by `integrations.push`; swallow-on-failure (in-app write still succeeds
  when Usapp throws); guest (no phone) skipped.
- **`verify-e2e.ts`**: exercises the **mock** OTP path across all tenants (proves no per-tenant branch);
  push gate off for seeded tenants (`push='none'`) → no outbound attempt.
- **Honest limitation:** real Usapp delivery **cannot be verified locally** — no allowlisted egress IP
  and no test Usapp account. Live send is a **staging/prod smoke test** with real creds + allowlisted IP,
  not part of the local gate. This is stated so "done" is not over-claimed.

## 9. Inviolable-rule compliance

- Usapp credentials (`USAPP_*`) = **platform infrastructure** in env, identical for every tenant.
- **Which** civic tenant fans out to Usapp = `integrations.push` **config data** (Zod-validated, seeded).
- OTP driver selection = global env (`OTP_DELIVERY_DRIVER`), consistent with the "sole channel" decision.
- **Zero `if (tenant === …)`** in `app/` or platform code. A repo grep for a tenant string still only
  hits seeds / `tenant-variants.json` / tests.

## 10. Out of scope (YAGNI)

- SMS aggregator fallback (Semaphore) — not built; OTP is Usapp-sole.
- Usapp **templates**, **batch send**, **webhooks**, **usage polling** — raw `content`, `format:"plain"`
  only. No template management.
- Device push tokens / FCM / Expo push — Usapp push is server-side message delivery, not device push.
- Per-tenant Usapp API keys — the platform is a single Usapp tenant.
