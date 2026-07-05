# STACK.md — Backend Architecture Blueprint

> **Purpose.** This is a technical reference for building a **new backend server for a
> separate mobile application**, distilled from the Usapp backend. It documents the exact
> stack, versions, structure, and patterns so the architecture can be replicated from
> scratch.
>
> **How to read it.** Every section flags what is **♻️ Reusable** (a generic pattern you
> should carry over to any messaging/real-time mobile backend) versus **📱 App-specific**
> (a Usapp product decision you should re-evaluate for your app). All versions below were
> verified against `package.json`, `Dockerfile`, `tsconfig.json`, and `nest-cli.json` in
> this repo — not assumed.

---

## 1. Overview

### Architectural approach

A **TCP-based microservices monorepo** built on NestJS. One **API Gateway** is the only
process exposed to clients (HTTP REST + WebSocket); every other capability is a separate
process that speaks **NestJS TCP transport** behind the gateway. All processes live in a
single repo sharing one `package.json`/lockfile and one shared library layer.

```
                         ┌──────────────────────────────────────────────┐
   Mobile app ──HTTP───▶ │  API Gateway  (HTTP :3005  +  TCP :3015)      │
   (REST + WS)  ◀──WS──▶ │  auth · CORS · Helmet · rate-limit · sockets  │
                         └───────┬───────┬───────┬───────┬───────┬───────┘
                                 │ TCP   │ TCP   │ TCP   │ TCP   │ TCP
                    ┌────────────┘       │       │       │       └────────────┐
                    ▼                    ▼       ▼       ▼                     ▼
              auth-service         user-service  messaging   notification   media
              :3006 (PG)           :3007 (PG)    :3008 (Mongo) :3009 (Mongo) :3010 (Mongo)
                    │                    │            │            │            │
              call-service :3012   integration-service :3004 HTTP + TCP
              (Mongo CDR)          (PG · admin panel · external API)
                    │                    │            │            │            │
              ┌─────┴──────────┬─────────┴────────────┴────────────┴─────┐
              ▼                ▼                                          ▼
         PostgreSQL         MongoDB                                    Redis
         (Prisma)           (Mongoose)                       (ioredis: sessions,
                                                              rate-limit, cache,
                                                              socket.io pub/sub)
                    Object storage: MinIO / S3-compatible (avatars, media)
```

**Why this shape (♻️ reusable reasoning):**

- **Single ingress.** Clients only ever talk to the gateway. Auth, throttling, security
  headers, device detection, and WebSocket fan-out live in exactly one place.
- **Process isolation per bounded context.** Auth, users, messaging, notifications, media,
  and calls fail, scale, and deploy independently. A crash in media never takes down auth.
- **Polyglot persistence by workload.** Relational identity/session data → PostgreSQL;
  high-write append-style documents (messages, notifications, call records) → MongoDB;
  ephemeral hot state (sessions, rate counters, cache, socket pub/sub) → Redis.
- **Shared libs, not shared runtime.** Config, logging, interceptors, DTOs, sanitization,
  and storage are a compiled library (`@app/common`) imported by every service, so
  cross-cutting behavior stays consistent without coupling the processes.

**📱 App-specific:** the *set* of services (auth/user/messaging/notification/media/call/
integration) reflects a real-time chat product. A different app keeps the **gateway +
shared-lib + polyglot-persistence** skeleton and swaps the domain services.

### Services at a glance

| Service | Transport | Port | Datastore | Responsibility | Reusable? |
|---|---|---|---|---|---|
| api-gateway | HTTP + TCP | 3005 / 3015 | — (Redis) | Single client entrypoint; auth guard, CORS, Helmet, rate-limit, WebSocket gateway | ♻️ pattern |
| auth-service | TCP | 3006 | PostgreSQL (Prisma) | OTP, JWT issue/refresh, sessions, token blacklist, login-attempt tracking | ♻️ pattern |
| user-service | TCP | 3007 | PostgreSQL (Prisma) | Profiles, contacts, device tokens, preferences, account lifecycle | ♻️ pattern |
| messaging-service | TCP | 3008 | MongoDB (Mongoose) | Message persistence, status, typing, edit/soft-delete | 📱 domain |
| notification-service | TCP | 3009 | MongoDB (Mongoose) | Push (Expo/APNs/FCM), in-app notifications, prefs | ♻️ pattern |
| media-service | TCP | 3010 | MongoDB + S3 | Media metadata + object storage (needs libvips/sharp) | ♻️ pattern |
| call-service | TCP | 3012 | MongoDB (Mongoose) | 1:1 voice/video signaling + call detail records | 📱 domain |
| integration-service | HTTP + TCP | 3004 / opt | PostgreSQL (Prisma) | Admin panel API, external-app API keys, usage/billing, webhooks | 📱 domain |

> Ports are declared in the Zod config schema and Docker `EXPOSE`s. TCP services boot with
> `NestFactory.createMicroservice`; the two HTTP-facing services (gateway, integration)
> boot with `NestFactory.create` + `connectMicroservice` (hybrid app).

---

## 2. Language & Runtime

| Concern | Choice | Version (verified) | Source |
|---|---|---|---|
| Language | TypeScript | `^5.7.3` | `package.json` devDeps |
| Runtime | Node.js | `22.22-alpine3.23` (build/runtime image) | `Dockerfile` `ARG NODE_IMAGE` |
| Node typings | `@types/node` | `^22.10.7` | `package.json` |
| Module system | CommonJS output | `"type": "commonjs"` | `package.json` |
| Compile target | ES2023 | `target: ES2023` | `tsconfig.json` |
| TS module / resolution | `esnext` / `bundler` | — | `tsconfig.json` |
| Package manager | npm (lockfile v3) | npm 10.x | `package-lock.json` |

**TypeScript is strict** (`strict: true`, `noImplicitAny`, `strictNullChecks`,
`strictBindCallApply`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`).
`emitDecoratorMetadata` + `experimentalDecorators` are on (required by NestJS DI +
class-validator).

**♻️ Reusable:** pin Node by digest/tag in the Dockerfile (not just `:22`), keep TS strict,
and enable decorator metadata. **📱 Note:** `media-service` additionally installs
`vips-dev` in its runtime stage because `sharp` needs libvips — only relevant if you do
server-side image processing.

---

## 3. Frameworks

### Core framework: NestJS 11

| Package | Version | Role |
|---|---|---|
| `@nestjs/core`, `@nestjs/common` | `^11.0.1` | DI container, module system |
| `@nestjs/platform-express` | `^11.0.1` | HTTP layer (Express under the gateway) |
| `@nestjs/microservices` | `^11.1.6` | **TCP transport** between services |
| `@nestjs/websockets` + `@nestjs/platform-socket.io` | `^11.1.18` | Real-time gateway |
| `@nestjs/config` | `^4.0.2` | Env loading (wrapped by a Zod schema, see §9) |
| `@nestjs/jwt` | `^11.0.1` | Access/refresh token signing |
| `@nestjs/throttler` | `^6.4.0` | Rate limiting (multi-window) |
| `@nestjs/schedule` | `^6.0.1` | Cron jobs (cleanup, deletion worker, DSAR) |
| `@nestjs/terminus` | `^11.0.0` | Health indicators |
| `@nestjs/swagger` | `^11.2.6` | OpenAPI (integration-service admin API) |
| `@nestjs/mongoose` | `^11.0.3` | Mongoose integration |
| `@nestjs/typeorm` + `typeorm` | `^11.0.0` / `^0.3.29` | Present but Prisma is primary for PG |
| `@nestjs/axios` | `^4.0.1` | Outbound HTTP (SMS provider, webhooks) |

### Supporting libraries

| Package | Version | Role | Reusable? |
|---|---|---|---|
| `socket.io` / `socket.io-client` | `^4.8.3` | WebSocket protocol | ♻️ |
| `@socket.io/redis-adapter` | `^8.3.0` | Multi-replica socket fan-out via Redis | ♻️ |
| `ioredis` | `^5.7.0` | Redis client | ♻️ |
| `zod` | `^4.1.12` | **Env-config validation** (see §9) | ♻️ |
| `class-validator` / `class-transformer` | `^0.14.2` / `^0.5.1` | DTO validation + transform | ♻️ |
| `helmet` | `^8.1.0` | Security headers | ♻️ |
| `bcrypt` | `^6.0.0` | Password/secret hashing (admin creds) | ♻️ |
| `dompurify` + `jsdom` | `^3.4.2` / `^26.1.0` | HTML/input sanitization | ♻️ |
| `ua-parser-js` | `^2.0.10` | Device detection middleware | ♻️ |
| `winston` + `nest-winston` + `winston-daily-rotate-file` | `^3.18.3` / `^1.10.2` / `^5.0.0` | Structured logging | ♻️ |
| `nestjs-cls` | `^6.1.0` | Async-local correlation-ID context | ♻️ |
| `prom-client` | `^15.1.3` | Prometheus metrics (standalone `/metrics` server) | ♻️ |
| `@aws-sdk/client-s3` | `^3.1070.0` | S3/MinIO object storage | ♻️ |
| `sharp` | `^0.34.5` | Image processing (media) | 📱 |
| `firebase-admin` | `^14.0.0` | FCM push | ♻️ |
| `@parse/node-apn` | `^7.1.0` | APNs / VoIP push | ♻️ |
| `expo-server-sdk` | `^6.1.0` | Expo push (RN app) | 📱 |
| `nodemailer` | `^9.0.1` | DSAR/compliance email | ♻️ |
| `rxjs` | `^7.8.1` | Nest's reactive core (TCP `.send()` returns Observables) | ♻️ |

**Testing / tooling:** Jest `^30.2.0` + `ts-jest` `^29.4.6` (unit `*.spec.ts`, e2e via
`apps/*/test/jest-e2e.json`), `supertest` `^7.0.0`, ESLint `^9` (flat config) +
`eslint-plugin-security` + Prettier, Husky `^9` + lint-staged pre-commit, `@nestjs/cli`
`^11` with **webpack** builder.

---

## 4. Dependencies (verified against `package.json`)

Full runtime dependency list, as pinned in the manifest:

```jsonc
// dependencies
"@aws-sdk/client-s3": "^3.1070.0",
"@nestjs/axios": "^4.0.1",
"@nestjs/common": "^11.0.1",
"@nestjs/config": "^4.0.2",
"@nestjs/core": "^11.0.1",
"@nestjs/jwt": "^11.0.1",
"@nestjs/microservices": "^11.1.6",
"@nestjs/mongoose": "^11.0.3",
"@nestjs/platform-express": "^11.0.1",
"@nestjs/platform-socket.io": "^11.1.18",
"@nestjs/schedule": "^6.0.1",
"@nestjs/swagger": "^11.2.6",
"@nestjs/terminus": "^11.0.0",
"@nestjs/throttler": "^6.4.0",
"@nestjs/typeorm": "^11.0.0",
"@nestjs/websockets": "^11.1.18",
"@parse/node-apn": "^7.1.0",
"@prisma/adapter-pg": "^7.0.0",
"@prisma/client": "^7.0.0",
"@socket.io/redis-adapter": "^8.3.0",
"bcrypt": "^6.0.0",
"class-transformer": "^0.5.1",
"class-validator": "^0.14.2",
"dompurify": "^3.4.2",
"dotenv": "^16.4.0",
"expo-server-sdk": "^6.1.0",
"firebase-admin": "^14.0.0",
"helmet": "^8.1.0",
"ioredis": "^5.7.0",
"jsdom": "^26.1.0",
"mongoose": "^8.16.4",
"nest-winston": "^1.10.2",
"nestjs-cls": "^6.1.0",
"nodemailer": "^9.0.1",
"pg": "^8.19.0",
"prom-client": "^15.1.3",
"reflect-metadata": "^0.2.2",
"rxjs": "^7.8.1",
"sharp": "^0.34.5",
"socket.io": "^4.8.3",
"typeorm": "^0.3.29",
"ua-parser-js": "^2.0.10",
"winston": "^3.18.3",
"winston-daily-rotate-file": "^5.0.0",
"zod": "^4.1.12"
```

**Security `overrides` (transitive-dependency pins).** The manifest force-resolves known
CVE-carrying transitive deps — carry this discipline over:

```jsonc
"overrides": {
  "minimatch": "^10.2.1", "glob": "^11.0.0", "schema-utils": "^4.3.0",
  "node-forge": "^1.4.0", "ws": "^8.21.0", "form-data": "^4.0.6",
  "hono": "^4.12.26", "@hono/node-server": "^1.19.13", "js-yaml": "^4.1.2",
  "multer": "^2.1.2", "undici": "^7.27.3", "uuid": "^11.1.1"
}
```

> ♻️ **Reusable rule:** a Trivy image scan gates the build (see §10). `overrides` +
> `apk upgrade` in the base image are how known-fixed CVEs are kept out of the image.

---

## 5. Database & Data Layer

### Three stores, chosen by workload

| Store | Version (compose) | ORM / client | Used by | What lives here |
|---|---|---|---|---|
| PostgreSQL | `postgres:16-alpine` | **Prisma 7** (`@prisma/client`, `@prisma/adapter-pg`) | auth, user, integration | Sessions, OTP, rate-limits, users, contacts, device tokens, admins, API keys, usage |
| MongoDB | `mongo:7` | **Mongoose 8** (`@nestjs/mongoose`) | messaging, notification, media, call | Messages, typing state, notifications, media metadata, call detail records |
| Redis | `redis:7-alpine` | **ioredis 5** (`@app/redis` lib) | all | Sessions cache, rate counters, deletion flags, socket.io pub/sub, general cache |
| Object storage | `minio/minio` (S3 API) | `@aws-sdk/client-s3` (`@app/common/storage`) | media, user (avatars) | Binary media, avatars |

### Prisma specifics (verified from schemas)

- **Per-service database, per-service schema file.** `auth-service`, `user-service`, and
  `integration-service` each own `prisma/schema.prisma` + `prisma/migrations/` and generate
  an isolated client into `apps/<svc>/generated/prisma` (custom `output`). This keeps the
  three PostgreSQL databases independently migratable and scalable.

  ```prisma
  generator client {
    provider = "prisma-client"          // new Prisma 7 generator
    output   = "../generated/prisma"     // client baked next to the service
  }
  datasource db {
    provider = "postgresql"
    // connection URL supplied at runtime via the pg driver adapter, not hard-coded
  }
  ```

- **Driver adapter.** `@prisma/adapter-pg` drives connections through `pg`, which lets each
  service target a **non-`public` Postgres schema** via `?schema=<name>` on the URL.
  ⚠️ *Consequence learned the hard way:* raw SQL with unqualified table names breaks under a
  non-`public` schema (`42P01 relation does not exist`) — use the Prisma query API, or
  fully-qualify. **♻️ Carry this constraint forward if you isolate services by schema.**

- **Migrations run at container start.** Each Prisma service's `CMD` runs
  `npx prisma migrate deploy` before `node dist/.../main` (see `Dockerfile`). The client is
  **generated at build time** and baked in; it is *not* re-generated at runtime (the
  `generated/` dir is root-owned and the process runs as non-root → would `EACCES`).

- **Index-heavy schemas.** Models declare many composite `@@index`es tuned to actual query
  shapes (e.g. `sessions(userId, isActive)`, `otp_requests(phoneNumber, isUsed, expiresAt)`)
  and `@map` DB column names to snake_case. ♻️ Index for your real access patterns, not by
  default.

### Mongoose specifics

- `@Schema()` / `@Prop()` decorator models; **TTL indexes** for ephemeral data (typing
  indicators auto-expire); `.lean()` on read-only queries; pagination by `beforeId` cursor.
- No migration step — schema changes take effect on restart; add data backfills explicitly.

### Redis usage patterns (♻️ all reusable)

- Session + rate-limit counters, `deleted:{userId}` token-revocation flags (right-to-erasure),
  general cache, and **socket.io pub/sub** via `@socket.io/redis-adapter` so multiple gateway
  replicas share WebSocket rooms (env-gated by `SOCKET_IO_ADAPTER=redis`).

---

## 6. Folder Structure

Verified top-level layout (NestJS monorepo — `nest-cli.json` registers every app/lib):

```
usapp_backend/
├── apps/
│   ├── api-gateway/                 # HTTP + WS entrypoint (Express + socket.io)
│   │   └── src/
│   │       ├── public/              # unauthenticated routes (health, OTP, login, download)
│   │       ├── protected/           # JWT-guarded routes
│   │       ├── guards/              # JwtGuard, ws-auth.guard
│   │       ├── gateways/            # socket.io gateways (real-time)
│   │       ├── adapters/            # redis-io.adapter (socket scale-out)
│   │       ├── middlware/           # device-detection middleware  [sic: dir name]
│   │       ├── health/              # terminus indicators
│   │       ├── media/ services/     # TCP client wrappers to downstream services
│   │       └── main.ts              # bootstrap: helmet, CORS, pipes, interceptors
│   ├── auth-service/                # TCP · PostgreSQL/Prisma
│   │   ├── prisma/                  # schema.prisma + migrations/
│   │   ├── generated/               # generated Prisma client (build artifact)
│   │   └── src/
│   │       ├── repositories/        # data-access layer (+ interface/)
│   │       ├── services/            # domain logic
│   │       ├── utils/               # e.g. demo-login, phone-number utils
│   │       ├── *.controller.ts      # @MessagePattern TCP handlers
│   │       ├── *.service.ts
│   │       ├── prisma.service.ts    # Prisma client lifecycle
│   │       └── main.ts              # createMicroservice(TCP) + startMetricsServer
│   ├── user-service/                # TCP · PostgreSQL/Prisma  (same shape)
│   ├── messaging-service/           # TCP · MongoDB/Mongoose
│   ├── notification-service/        # TCP · MongoDB/Mongoose
│   ├── media-service/               # TCP · MongoDB + S3 (sharp/libvips)
│   ├── call-service/                # TCP · MongoDB (voice/video CDR)
│   ├── integration-service/         # HTTP + TCP · PostgreSQL (admin API, external API)
│   │   ├── prisma/  generated/
│   │   └── src/{admin,guards,repositories,utils,...}
│   ├── admin-panel/                 # Vite + React SPA (own package.json + Dockerfile)
│   └── webapp/                      # Next.js marketing/web app (own package.json)
├── libs/
│   ├── common/src/                  # @app/common — shared across every service
│   │   ├── config/                  # Zod schema + AppConfigService getters
│   │   ├── decorators/              # @CurrentUser, etc.
│   │   ├── interceptors/            # response/context/correlation-id/strip-internal
│   │   ├── dto/                     # shared request/response DTOs
│   │   ├── jwt/                     # shared JWT helpers
│   │   ├── logger/                  # winston config
│   │   ├── sanitization/            # DOMPurify-based input cleaning
│   │   ├── storage/                 # S3/MinIO client
│   │   ├── metrics/                 # standalone prom-client /metrics server
│   │   ├── providers/  interfaces/  utils/
│   │   └── index.ts                 # barrel export (@app/common)
│   ├── mongodb/src/                 # @app/mongodb — Mongoose module/connection abstraction
│   └── redis/src/                   # @app/redis — ioredis module/service
├── monitoring/                      # prometheus.yml, loki-config, promtail, grafana/
├── scripts/                         # deploy.sh, encrypt-env.sh, init-db.sql, system-check.ts
├── load-testing/                    # k6 harness + seed/report helpers
├── docker-compose.yml               # base infra (postgres, mongo, redis, minio)
├── docker-compose.<env>.yml         # development / production / staging / registry / ...
├── docker-compose.monitoring*.yml   # observability overlays
├── Dockerfile                       # ONE multi-stage build for all 8 services
├── nest-cli.json                    # monorepo project registry
├── tsconfig.json                    # strict, ES2023, path aliases
└── package.json                     # single shared manifest + lockfile
```

**♻️ Reusable conventions:**

- **`apps/*` = deployable processes, `libs/*` = shared code**, one manifest at the root.
- Per service: `main.ts` (bootstrap) → `*.module.ts` (wiring) → `*.controller.ts` (transport
  handlers) → `services/` (logic) → `repositories/` (data access). DTOs shared via
  `@app/common/dto`.
- **Path aliases** (`tsconfig.json`): `@app/common`, `@app/mongodb`, `@app/redis` — mirrored
  in the Jest `moduleNameMapper`.

**📱 App-specific:** `admin-panel` (React SPA) and `webapp` (Next.js) are isolated
sub-projects with their own `package.json`/Dockerfile; drop or replace them per your product.

---

## 7. Architecture & Patterns

### Layering (♻️ reusable)

```
Client → API Gateway (HTTP/WS) → [TCP] → Service Controller (@MessagePattern)
                                            → Service (domain logic)
                                              → Repository (Prisma/Mongoose)
                                                → Datastore
```

- **Controllers** are thin transport adapters. Gateway REST controllers translate HTTP →
  `client.send({ cmd: 'x' }, payload)`; service controllers handle those with
  `@MessagePattern({ cmd: 'x' })`.
- **Services** hold domain logic and orchestrate repositories.
- **Repositories** isolate all data access (Prisma queries or Mongoose models), often with a
  parallel `interface/` for testability. Pure helpers (e.g. `buildAuditWhere`,
  `usagePeriodForDate`) are extracted and unit-tested in isolation.

### Inter-service communication (♻️ reusable)

- **NestJS TCP transport**, message shape `{ cmd: 'command-name' }` + payload. Calls return
  RxJS Observables; the gateway `.toPromise()`/`firstValueFrom`s them.
- **Reconnection is configured**, not default: `TCP_CONNECTION_MAX_RETRIES` (50),
  `TCP_CONNECTION_BASE_DELAY` (1s), `TCP_CONNECTION_MAX_DELAY` (30s) — so a service restart
  doesn't permanently break clients.
- The gateway *also* exposes its own inbound TCP port (`API_GATEWAY_TCP_PORT` 3015) so
  downstream services can **push events back** to it (e.g. deliver a message to a connected
  socket).

### Cross-cutting via shared interceptors (♻️ reusable)

Registered globally in `main.ts`:

- `MicroserviceResponseInterceptor` — uniform response envelope.
- `MicroserviceContextInterceptor` + `nestjs-cls` — propagate request context across the
  async call chain.
- `CorrelationIdInterceptor` — a correlation ID per request, threaded through logs across
  service boundaries.
- `StripInternalFieldsInterceptor` (gateway) — scrub internal-only fields before the client
  sees a response.

### Real-time (♻️ reusable)

`socket.io` gateway on the API Gateway; JWT-authenticated at the WS handshake
(`ws-auth.guard`). For horizontal scale, `SOCKET_IO_ADAPTER=redis` swaps in
`@socket.io/redis-adapter` so events fan out across gateway replicas via Redis pub/sub —
otherwise single-instance behavior is unchanged.

### Scheduled work (♻️ reusable)

`@nestjs/schedule` cron jobs handle OTP/session cleanup, the account-deletion worker
(batched by `DELETION_WORKER_BATCH_SIZE`), and DSAR/compliance tasks. ⚠️ **If you run more
than one replica of a service that owns crons, add a Redis lock** so the job fires once, not
once-per-pod.

### Observability (♻️ reusable)

- Each service starts a **standalone `prom-client` HTTP server** on `METRICS_PORT` (9464) via
  `startMetricsServer()` from `@app/common` — deliberately *not* a Nest route, to avoid the
  hybrid-app + interceptor interference on pure-TCP services. Prometheus scrapes
  `<service>:9464/metrics` over the docker network (not host-published).
- Logs: **Winston** structured + daily-rotate to `logs/`, shipped by **Promtail → Loki**,
  visualized in **Grafana** alongside Prometheus. Host/box monitoring (node-exporter,
  cAdvisor) is intentionally excluded — only the app services are scraped.

---

## 8. Authentication & Security

### Auth model (📱 phone-OTP, but the token machinery is ♻️ reusable)

1. Client requests an OTP (`/otp/request`); auth-service generates it and dispatches SMS
   (real provider or a mock service in dev).
2. Client verifies (`/otp/verify`) → auth-service issues a **JWT access token** (short-lived,
   `JWT_ACCESS_EXPIRES_IN` = 900s) + **refresh token** (`JWT_REFRESH_EXPIRES_IN` = 604800s),
   and records a **session** row.
3. Protected gateway routes run `JwtGuard`; WebSocket handshakes run `ws-auth.guard`.
4. `/refresh-token` rotates the access token using the stored refresh token.
5. **Revocation:** logout/blacklist + a Redis `deleted:{userId}` flag (right-to-erasure) that
   the gateway checks so tokens are rejected immediately after account deletion, until the
   flag TTL (`USER_DELETION_CACHE_TTL_SECONDS` ≥ access-token lifetime) lapses.

> **📱 Reviewer/demo bypass:** an env-gated fixed-OTP path (`DEMO_LOGIN_*`, off by default)
> lets app-store reviewers sign in without a real SIM. Fail-safe: enabled-but-no-OTP = off.
> Keep this pattern *only* if you submit to app stores; guard it hard.

### Defense-in-depth (♻️ all reusable)

- **Helmet** on the gateway: CSP, HSTS (1y, preload), `frameguard: deny`, `noSniff`,
  referrer-policy `no-referrer`, hidden `X-Powered-By`, plus a custom `Permissions-Policy`
  locking down camera/mic/geo/payment.
- **Global `ValidationPipe`** with `whitelist` + `forbidNonWhitelisted` + `transform`, and
  `disableErrorMessages` in production (don't leak validation internals).
- **Input sanitization** via DOMPurify + jsdom for any HTML-bearing input.
- **Rate limiting** (`@nestjs/throttler`) with multiple windows, plus explicit per-phone /
  per-IP OTP caps (`MAX_OTP_REQUESTS_PER_PHONE_PER_HOUR/DAY`, `..._PER_IP_PER_HOUR`). A
  test-only `LOAD_TEST_MODE` bypass is **hard-guarded off when `NODE_ENV=production`**.
- **CORS** allow-list from config; credentials on; 24h preflight cache.
- **Trust proxy = 1** (behind a reverse proxy) so client IPs/rate-limits are correct.
- **Least-privilege containers:** every runtime image runs as a non-root `appuser`.
- **Admin plane isolation** (integration-service): separate admin JWT secrets
  (`JWT_ADMIN_*`), bcrypt-hashed superadmin seed, dedicated admin/super-admin/api-key guards.
- **Secrets at rest:** environment files are SOPS/age-encrypted (`*.env.*.enc`), decrypted on
  the host at deploy time — never committed in plaintext.

---

## 9. Configuration & Environment

### Pattern: one Zod schema, one typed accessor (♻️ strongly reusable)

All env vars flow through a single `zod` schema (`libs/common/src/config/config.schema.ts`)
that **validates, coerces, and defaults** every variable at boot. Services read them through
`AppConfigService` getters — no raw `process.env` scattered in domain code. A missing/invalid
required var **fails fast at startup** instead of surfacing as a runtime `undefined`.

```ts
// libs/common/src/config/config.schema.ts (excerpt — verified)
export const configSchema = z.object({
  NODE_ENV: z.enum(['development','staging','production']).default('development'),
  API_GATEWAY_PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)).default(3005),
  AUTH_SERVICE_TCP_PORT: z.string().transform(Number).pipe(z.number().min(1024).max(49151)),
  AUTH_SERVICE_DATABASE_URL: z.string().url(),
  MONGODB_MESSAGING_URI: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  OTP_LENGTH: z.string().transform(Number).pipe(z.number().min(4).max(8)).default(6),
  METRICS_PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)).default(9464),
  // ...
});
export type ConfigSchema = z.infer<typeof configSchema>;
```

### Key variable groups (verified from the schema)

| Group | Representative vars | Notes |
|---|---|---|
| Runtime | `NODE_ENV`, `LOAD_TEST_MODE` | load-test bypass forced off in prod |
| Service ports | `API_GATEWAY_PORT`, `*_SERVICE_TCP_PORT`, `API_GATEWAY_TCP_PORT`, `METRICS_PORT` | TCP capped ≤ 49151 |
| Service hosts | `*_SERVICE_TCP_HOST` | default `localhost` → **override to compose service names in Docker** |
| Databases | `AUTH_SERVICE_DATABASE_URL`, `USERS_SERVICE_DATABASE_URL`, `INTEGRATION_SERVICE_DATABASE_URL`, `MONGODB_*_URI`, `REDIS_URL`/`REDIS_HOST`/`REDIS_PORT` | PG URLs validated as URLs |
| JWT | `JWT_ACCESS_SECRET` (≥64), `JWT_REFRESH_SECRET` (≥64), `JWT_*_EXPIRES_IN`, `JWT_ADMIN_*` | secrets length-enforced |
| OTP / rate-limit | `OTP_LENGTH`, `OTP_EXPIRY_MINUTES`, `MAX_OTP_ATTEMPTS`, `MAX_OTP_REQUESTS_PER_*` | |
| Push | `EXPO_ACCESS_TOKEN`, `FIREBASE_*`, `APNS_*` | all optional → services boot without them |
| Storage | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_FORCE_PATH_STYLE` | path-style required for MinIO |
| WebRTC | `STUN_SERVER_URL`, `TURN_*` | 📱 call feature |
| Compliance | `DPO_EMAIL`, `SMTP_*`, `DSAR_RESPONSE_DEADLINE_DAYS`, `BACKUP_RETENTION_DAYS`, `USER_DELETION_CACHE_TTL_SECONDS` | 📱 GDPR/DSAR |
| App/product | `APP_MIN_SUPPORTED_VERSION`, `APP_UPDATE_MESSAGE`, `PLAY_STORE_LINK`, `APP_IOS_URL`, `BILLING_TIMEZONE` | 📱 force-update gate + billing tz |

> ⚠️ **`localhost` defaults are for bare-metal dev only.** Inside containers, host vars are
> overridden to compose **service DNS** (e.g. `S3_ENDPOINT=http://minio:9000`,
> `AUTH_SERVICE_TCP_HOST=auth-service`). Never leave `localhost` in a containerized runtime
> (IPv6/loopback resolution is unreliable across Docker networks). **♻️ Adopt this rule.**

> ⚠️ **Timezone-sensitive aggregation:** `BILLING_TIMEZONE` (IANA, e.g. `Asia/Manila`) exists
> because monthly usage buckets must be computed in business-local time, not the container's
> UTC clock — otherwise month boundaries roll over hours early. ♻️ If you aggregate by
> calendar period, pin the zone explicitly; don't trust the container clock.

**Env files per environment:** `.env.development`, `.env.staging`, `.env.production` (with
`.env.example` as the template). Production/staging files are SOPS/age-encrypted `*.enc` and
decrypted on the host at deploy.

---

## 10. Build / Run / Deploy

### Local development

```bash
npm install                      # postinstall auto-runs prisma:generate for all 3 PG services

# Infra only (Postgres, Mongo, Redis, MinIO):
docker compose -f docker-compose.yml -f docker-compose.development.yml up -d

# Run services (host):
npm run start:dev api-gateway    # one service, watch mode
npm run start:microservices      # all services concurrently

# DB:
npm run prisma:migrate           # migrate auth + user + integration
npm run prisma:generate          # regenerate all Prisma clients
```

### Build & test

```bash
npm run build                    # nest build (webpack) → dist/
npm run test                     # jest unit (*.spec.ts)
npm run test:cov                 # coverage (thresholds enforced: 85% lines/statements)
npm run test:e2e                 # e2e (apps/api-gateway/test/jest-e2e.json)
npm run lint    / npm run typecheck   # eslint --fix / tsc --noEmit
npm run loadtest:capacity        # k6 capacity run
```

### Container build (♻️ single multi-stage Dockerfile — verified)

One `Dockerfile` builds **all 8 services**. Because the monorepo shares one lockfile,
dependencies install **once** in shared `deps` (dev) / `prod-deps` (runtime) stages instead
of per service:

```
base (node:22.22-alpine + apk upgrade for CVEs)
 ├─ deps        → npm ci + prisma generate  → development image (hot-reload)
 ├─ build       → nest build ×8 services
 ├─ prod-deps   → npm ci --omit=dev + prisma generate
 └─ runtime-base (non-root appuser, prod node_modules)
      └─ api-gateway | auth-service | user-service | messaging-service |
         notification-service | media-service | call-service | integration-service
```

- Each service target copies only its own compiled `dist/apps/<svc>` + (for Prisma services)
  the baked `generated/` client, runs as `appuser`, and `EXPOSE`s its port.
- Prisma services run `prisma migrate deploy` in their `CMD` before starting.
- `media-service` adds `vips-dev` (sharp).

### Deploy pipeline (📱 this repo's setup — pattern is ♻️)

- **CI (`build.yml`)** on push to `develop`/`master`: build → **Trivy image scan gate** →
  SBOM → **cosign sign** → push to GHCR (digest-pinned).
- **Staging auto-deploys** from `develop`; **production is manual** (`deploy.yml`,
  `workflow_dispatch`, master-only guard) on a self-hosted on-prem runner.
- **`scripts/deploy.sh`**: `cosign verify` → pull **by signed digest** → Trivy rescan →
  **SOPS/age decrypt** env → `docker compose up` (base + registry + monitoring overlays) →
  smoke test → rollback on failure.
- **Compose overlays** compose by concern: base infra + `.registry.yml` (GHCR digests) +
  `.<env>.yml` (dev/staging/prod) + `.monitoring.yml` + optional `.loadbalancer.deploy.yml`
  (Traefik, gateway replicas).

**♻️ Reusable deploy principles:** scan-and-sign in CI, deploy **by digest** (never a mutable
tag), decrypt secrets on the host at deploy time, smoke-test + auto-rollback, gate production
behind a manual/approved dispatch.

---

## Replication checklist (build a new backend from this blueprint)

1. **Scaffold** a NestJS 11 monorepo (`nest new` + `nest g app`/`nest g lib`); register apps
   and libs in `nest-cli.json`; set strict `tsconfig.json` + path aliases; `"type":"commonjs"`.
2. **Shared lib first** (`@app/common`): Zod config schema + `AppConfigService`, Winston
   logger, correlation-id/response interceptors, DTOs, sanitization, the standalone
   `prom-client` metrics server. Add `@app/redis`, `@app/mongodb` as needed.
3. **API Gateway**: HTTP + WS entrypoint; Helmet, CORS allow-list, global `ValidationPipe`,
   `JwtGuard`, throttler, device middleware; TCP clients to services with retry config.
4. **Domain services** as TCP microservices (`createMicroservice`), each owning its datastore
   (Prisma-per-DB for relational, Mongoose for documents), `main.ts` bootstrapping the metrics
   server.
5. **Auth**: OTP (or your factor) → JWT access+refresh + session table + Redis revocation flag.
6. **Cross-cutting**: correlation IDs, structured logs → Loki, `/metrics` → Prometheus,
   scheduled cleanup (Redis-locked if multi-replica).
7. **Packaging**: one multi-stage Dockerfile, non-root runtime, migrations at startup, single
   lockfile, `overrides` for CVEs.
8. **Delivery**: CI scan+sign, digest-pinned deploy, encrypted env at rest, smoke + rollback,
   manual-gated production.

---

*Generated as a reusable architecture reference. Versions verified against `package.json`,
`Dockerfile`, `tsconfig.json`, `nest-cli.json`, `docker-compose.yml`, and
`libs/common/src/config/config.schema.ts` as of this commit.*
