# BUILD_PLAN — Civic Super-App Platform MVP

Mission: one mobile codebase + one backend serve many LGUs; every per-LGU difference is
**data (tenant config), never code**. Scope = `docs/Civic_SuperApp_Platform_Reference.md` §10.
Backend stack = `docs/STACK.md`. Mobile stack = `docs/STACK_BASIS.md`.

## Repo shape

```
backend/              NestJS 11 TCP-microservices monorepo (STACK.md)
mobile-application/   Expo SDK 54 React Native app (STACK_BASIS.md)
docs/                 the three source-of-truth documents
BUILD_PLAN.md         this plan
TRACEABILITY.md       living verification checklist (one row per Reference §10 entry)
```

## Backend service topology

Single ingress API Gateway (HTTP :3005) + TCP microservices behind it, one repo, one
lockfile, shared `@app/common` / `@app/redis` / `@app/mongodb` libs. Domain set follows
Reference §1/§5; skeleton (gateway + shared libs + polyglot persistence) follows STACK.md.

| Service | Transport | Port | Store | Reference |
|---|---|---|---|---|
| api-gateway | HTTP + WS | 3005 | Redis | §2 tenant resolution, module-flag enforcement |
| tenancy-service | TCP | 3006 | Postgres/Prisma | §2 tenants, §3 config service |
| identity-service | TCP | 3007 | Postgres/Prisma | §5.1 OTP, JWT, guest, profile, digital ID |
| egov-service | TCP | 3008 | Postgres/Prisma | §5.2 catalog, applications, payments, QR stubs |
| reports-service | TCP | 3009 | MongoDB | §5.3 311 tickets, routing, audited status machine |
| assistance-service | TCP | 3010 | MongoDB | §5.4 programs, requests, claim scheduling |
| emergency-service | TCP | 3011 | MongoDB | §5.5 SOS sessions, hotlines |
| content-service | TCP | 3012 | MongoDB | §5.6 CMS posts, FAQ, feedback |
| places-service | TCP | 3013 | MongoDB | §5.7 POIs/favorites, §5.8 transport, §5.11 search |
| notification-service | TCP | 3014 | MongoDB | §5.9 inbox, unread badge, push adapters |
| media-service | TCP | 3016 | MongoDB + S3 | §5.10 presigned uploads, EXIF strip |
| integration-service | TCP | 3017 | Redis cache | §5.12 weather/AQI per tenant centroid |

Infra (docker compose): `postgres:16-alpine`, `mongo:7`, `redis:7-alpine`, `minio/minio`.
Metrics: standalone prom-client server per service (`METRICS_PORT` family). Config: one Zod
schema + `AppConfigService`. Every domain row carries `tenant_id`; every generated id uses
the tenant prefix (`{PREFIX}-######`).

Tenant resolution: mobile pins `X-Tenant-ID` (from bundle id `com.<location>.app`); the
gateway resolves+validates the tenant and enforces `modules.{name}` flags **before** any
domain call; QR-verify carries tenant in the signed payload.

## Mobile app

Expo ~54 / RN 0.81 / React 19.1, expo-router ~6, TanStack Query ~5.90 + AsyncStorage
persister, NativeWind ^4.2, axios ^1.13, expo-secure-store. Load-bearing rules (inviolable):

1. Layering: component → query/mutation hook → service fn → api client. UI never imports axios.
2. Transient-vs-dead auth: 401/403 on refresh = dead session → logout; 429/5xx/network =
   transient → keep session. Offline never logs the user out.
3. Single-palette theming: `constants/colors.ts` palette is **hydrated from tenant config**;
   every token has a `-dark` sibling.
4. Cached-session startup: route on token presence from storage; never block splash on network.

White-label: `app.config.ts` reads `APP_VARIANT` → bundle id `com.dasmarinas.app` /
`com.sorsogon.app` → tenant key. App boots from the Config service response (theme,
onboarding slides, home flags, module grid). Zero per-tenant branches in code.

## Milestones (Reference §9) — each wired end-to-end and verified before the next

- **M0 Foundation** — backend monorepo + @app/common; gateway (tenant resolution, module
  flags); tenancy control plane + Config service; compose infra. Mobile skeleton: provider
  tree, cached-session startup gate, config-driven theme. Seed MyDasma + MySorsogon with the
  exact proof-of-pattern values (colors, slogans, executives, prefixes, geo, modules).
- **M1 Identity** — OTP request/verify, guest sessions, JWT access+refresh rotation,
  blacklist, device headers; Digital Resident ID + signed-QR public verify. Mobile: +63
  login, OTP entry/resend, guest, token-refresh singleton, force-update gate (fails open).
- **M2 Live branded home** — Content CMS + Notifications + Weather/AQI. Mobile home:
  greeting+avatar, bell+badge, announcements carousel, Mayor's Corner, weather card, nearby
  strip, digital-ID promo, 12-tile module grid with config-disabled "coming soon" tiles.
- **M3 First civic loop** — Reports 311 (6 categories, photo, geo pin, audited status
  machine, category→department routing) + Media service. Mobile: report flow + timeline.
- **M4 Revenue** — e-Gov catalog + payments (adapter, idempotency keys, receipt numbering,
  ₱20 convenience fee) + QR claim stub + `PENDING_PAYMENT→PROCESSING→READY→CLAIMED`.
- **M5 Assistance** — 5 programs, `SUBMITTED→UNDER_REVIEW→APPROVED|DENIED`, claim
  scheduling, requirement checklists. Mobile: programs + active-request tracker.
- **M6 Emergency** — SOS hold-to-activate, live location (WS), dispatch routing, degraded
  native-dial fallback; hotlines directory (offline-cached, tap-to-call, org tags).
- **M7 Discovery** — Places (kind, open-now, favorites, directions), Transport (From→To,
  fares), Search (federated, recents, quick actions), Digital City ID screen (QR/verify).
- **M8 Platform glue** — notifications on every status machine, append-only audit log,
  EN/FIL toggle, settings/help/feedback/logout. Post-MVP (hierarchy, analytics, billing
  tiers) stubbed cleanly behind flags.

- **M9 Admin plane & consoles** — admin-service (platform_admin / tenant_admin
  hierarchy, separate JWT_ADMIN_* secrets, bcrypt-12, rotation + reuse-kill);
  gateway /v1/admin/* (tenant CRUD + config/branding/modules with zod contract
  validation, brand-asset presign/confirm, ops transitions actor=admin:*, posts,
  feedback, audit); media 'brand' kind incl. sanitized SVG; two Vite+React
  consoles served by nginx containers (:8090 platform, :8091 tenant); mobile
  renders config asset URLs (strict http(s)-only with fallbacks).

## Verification protocol

Per feature: (1) build both sides; (2) VERIFY — typecheck+lint+tests green, endpoints return
tenant-scoped prefixed data, screens render real responses; (3) RE-VERIFY — full flow on
BOTH tenants proving: no per-tenant code branches (grep the diff), module off for one tenant
is inert for it / live for the other, ids/theme/onboarding/executive come from config,
OTP→JWT + rotation work, offline/429 never logs out, status machines render audited
timelines. Statuses tracked in TRACEABILITY.md: ❌ todo → 🟡 built → ✅ verified → 🔁 re-verified.

DONE = every §10 row 🔁 + typecheck/lint/tests pass in both apps + `docker compose up` clean
+ the app boots BOTH tenants purely from config + final self-audit against §10.
