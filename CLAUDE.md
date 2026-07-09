# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The one inviolable rule

**Every per-LGU difference is data (tenant config), never code.** Branding, slogan,
executive, onboarding, module set, hotlines, fees, categories, geo, integrations —
all live in the tenant `config` row (Reference §3 contract, Zod-validated), seeds, or
`mobile-application/tenant-variants.json`. There are **zero per-tenant branches in
`app/` or platform code**; a repo-wide grep for a tenant string must only hit seed data,
`tenant-variants.json`, and test inputs. Adding a new LGU (see MyLegazpi, tenant #3) must
touch only data — if you find yourself writing `if (tenant === ...)` you are doing it wrong.

Three seeded tenants prove the pattern: MyDasma (`com.dasmarinas.app`, `ph-cavite-dasmarinas`),
MySorsogon (`com.sorsogon.app`, `ph-sorsogon-sorsogoncity`), MyLegazpi (`com.legazpi.app`,
`ph-albay-legazpi`).

## Repo shape

- `backend/` — NestJS 11 TCP-microservices monorepo (one lockfile, shared `@app/*` libs)
- `mobile-application/` — Expo SDK 54 / RN 0.81 white-label app; boots entirely from `/v1/config`
- `docs/` — **sources of truth**: `Civic_SuperApp_Platform_Reference.md` (scope, §10 = feature
  checklist, §3 = config contract), `STACK.md` (backend), `STACK_BASIS.md` (mobile), `designs/`
- `BUILD_PLAN.md` — milestone plan (M0–M9) · `TRACEABILITY.md` — living §10 verification matrix

## Backend architecture

Single HTTP **API Gateway** (`:3005`, HTTP + WS, Redis) fronts **12 TCP microservices**
(one Nest monorepo). Polyglot persistence by domain:

- **Postgres / Prisma** — tenancy, identity, egov, admin (each has its own `prisma.config.ts`
  and migration set; `prisma:migrate` / `prisma:generate` iterate all four)
- **MongoDB / Mongoose** — reports, assistance, emergency, content, places, notification, media
- **Redis** — gateway (cache, socket.io adapter), integration (weather/AQI cache)
- **MinIO / S3** — media + brand assets (presigned PUT, EXIF strip for raster, DOMPurify for SVG)

Load-bearing gateway responsibilities (in `apps/api-gateway/src`):
1. **Tenant resolution** — reads `X-Tenant-ID` (mobile pins it from its bundle id), validates
   the tenant, injects it downstream. QR-verify carries tenant in the signed payload instead.
2. **Module-flag enforcement** — checks `config.modules.{name}` **before** any domain RPC; a
   disabled module returns 403 (and the mobile tile is hidden). This is how one tenant can have
   a feature live while another has it inert, with no code difference.
3. **Two JWT planes** — resident tokens (`JWT_*`) and admin tokens (`JWT_ADMIN_*`) use separate
   secret families and are **mutually unusable**. Admin scope (platform vs tenant) is enforced
   server-side; a tenant admin touching another tenant = 403.

Conventions every service follows: shared libs `@app/common` (config/ids/tenant/logger/metrics/
rpc/interceptors), `@app/redis`, `@app/mongodb`. Every domain row carries `tenant_id`; every
generated id uses the tenant prefix `{PREFIX}-######` (e.g. `DSM-000001`, `SOR-OR-2026-000001`).
Status machines (311, e-gov, assistance, SOS) are **audited** — each transition records actor +
timestamp + note into an append-only `timeline[]`; illegal transitions are 409.

Two containerized admin consoles ship with the stack: **platform-admin-panel** (`:8090`,
`platform_admin` — all tenants, module/billing toggles, create tenant admins) and
**tenant-admin-panel** (`:8091`, `tenant_admin` — own tenant branding/assets/posts/feedback/ops).
Admin writes produce **new config versions** that the mobile app picks up on next refresh.

## Mobile architecture

Expo SDK 54, expo-router v6, TanStack Query v5 (+ AsyncStorage persister), NativeWind v4.
White-label: `app.config.ts` reads `APP_VARIANT` → bundle id → tenant key; the installed app
derives its tenant from its bundle id. Everything on screen comes from the `/v1/config` response.

Four inviolable rules (from `BUILD_PLAN.md`):
1. **Layering** — component → query/mutation hook (`hooks/`) → service fn (`services/`) → api
   client (`services/api.ts`). **UI never imports axios.** Add new backend calls as a service fn.
2. **Transient-vs-dead auth** — 401/403 on token refresh = dead session → logout; 429/5xx/network
   = transient → keep the session. **Offline never logs the user out.** Logic in `lib/token-refresh.ts`.
3. **Single-palette theming** — `constants/colors.ts` is hydrated from tenant config at runtime;
   every token has a `-dark` sibling. No hard-coded per-tenant colors.
4. **Cached-session startup** — `app/index.tsx` routes on token presence from storage; never
   block the splash on network.

## Commands

Backend (`cd backend`; scripts read `.env.development`, seeded from `.env.example`):

```bash
npm run build:all          # nest build every app (api-gateway + 12 services)
npm run lint               # eslint apps + libs
npm run typecheck          # tsc --noEmit
npm test                   # jest (*.spec.ts)
npx jest apps/identity-service/src/foo.spec.ts   # single file
npx jest -t "rejects reused refresh token"       # single test by name
npm run prisma:migrate     # migrate all four Prisma services (tenancy, identity, admin, egov)
npm run seed:all           # tenants + content + categories + catalog + hotlines + programs + places
# full stack (4 infra + 12 services + 2 panels):
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d --build
# §10 end-to-end verification suite (both/all tenants, expects N passed / 0 failed):
npx ts-node -P tsconfig.scripts.json scripts/verify-e2e.ts
```

Standalone control-plane / ops scripts (staff-console stand-ins) **must** run with
`-P tsconfig.scripts.json`: `scripts/toggle-module.ts`, `transition-ticket.ts`,
`transition-application.ts`, `transition-assistance.ts`.

Mobile (`cd mobile-application`):

```bash
EXPO_PUBLIC_TENANT_BUNDLE_ID=com.dasmarinas.app npx expo start   # dev; swap bundle id to re-tenant
npx tsc --noEmit          # typecheck
npm run lint              # expo lint
npm test                  # jest (unit + live-backend integration under __tests__/integration)
npx jest __tests__/token-refresh.test.ts         # single file
npx expo export --platform web                    # web build (also part of verification)
```

`mobile-application/AGENTS.md`: **read the versioned Expo v54 docs
(https://docs.expo.dev/versions/v54.0.0/) before writing any mobile code** — the SDK has
breaking changes and memory of older Expo APIs is unreliable.

## Verification discipline (how this repo defines "done")

Do not claim a feature is done on typecheck alone. The protocol (`BUILD_PLAN.md`, tracked in
`TRACEABILITY.md` with ❌ todo → 🟡 built → ✅ verified → 🔁 re-verified) is: build both sides,
then **re-verify the full flow on all tenants** proving no per-tenant code branch, module-off is
inert for one tenant and live for another, ids/theme/onboarding/executive come from config, auth
rotation + offline-never-logout hold, and status machines render audited timelines. `verify-e2e.ts`
is the backend gate; jest integration suites (both tenants) + `expo export` are the mobile gate.
When you add or change a §10 feature, update its `TRACEABILITY.md` row.

## Notes

- `.env`, `.env.development`, `.env.example` and any `*.key`/secret files: never overwrite, copy,
  or delete them. Temp/validation files go in the scratch dir with unique names.
- The `type: commonjs` backend uses `ts-node` for scripts and `nest build` (webpack per app) for services.
