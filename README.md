# Civic Super-App Platform

One platform, many LGUs. A single **Expo React Native** codebase and a single
**NestJS microservices** backend serve any city as a *tenant*: every per-LGU
difference — branding, slogan, executive, onboarding, module set, hotlines,
fees, categories, content — is **data (tenant config), never code**.

Two tenants are seeded as proof of pattern: **MyDasma** (`com.dasmarinas.app`,
green/DSM) and **MySorsogon** (`com.sorsogon.app`, blue/SOR).

- `docs/` — sources of truth: platform reference (scope), backend stack, mobile stack
- `backend/` — API gateway + 11 TCP microservices (Postgres/Prisma, MongoDB, Redis, MinIO)
- `mobile-application/` — white-label Expo app (SDK 54), boots entirely from `/v1/config`
- `BUILD_PLAN.md` — milestone plan · `TRACEABILITY.md` — living §10 verification checklist

## Backend — local dev

```bash
cd backend
cp .env.example .env.development       # then set the three JWT/QR secrets (>= 64 chars)
docker compose up -d                    # postgres 16, mongo 7, redis 7, minio
npm install
npm run prisma:migrate                  # tenancy + identity + egov databases
npm run seed:all                        # tenants, content, categories, catalog, hotlines, programs, places
npm run build:all
# start services (each reads .env.development):
for s in tenancy identity egov reports assistance emergency content places notification media integration; do
  node dist/apps/$s-service/main.js & done
node dist/apps/api-gateway/main.js &
```

Smoke test:

```bash
curl -H 'X-Tenant-ID: com.dasmarinas.app' localhost:3005/v1/config | jq .data.config.app
npx ts-node -P tsconfig.scripts.json scripts/verify-e2e.ts   # 106-check §10 suite, both tenants
```

## Backend — containers

```bash
cd backend
docker compose -f docker-compose.yml -f docker-compose.services.yml up -d --build
```

One multi-stage `Dockerfile` builds all 12 services; Prisma services run
`prisma migrate deploy` at start; only the gateway publishes `:3005`.

## Mobile app

```bash
cd mobile-application
npm install
EXPO_PUBLIC_TENANT_BUNDLE_ID=com.dasmarinas.app npx expo start   # or com.sorsogon.app
```

The installed app derives its tenant from its **bundle id** (`APP_VARIANT`
white-label builds via `tenant-variants.json`); in dev the env var stands in.
Swapping the tenant re-brands *and* re-scopes the app with zero code change.

Tests (unit + live-backend integration for both tenants):

```bash
npx tsc --noEmit && npx jest && npx expo export --platform web
```

## Control-plane scripts (staff-console stand-ins)

```bash
cd backend
npx ts-node -P tsconfig.scripts.json scripts/toggle-module.ts ph-sorsogon-sorsogoncity news false
npx ts-node -P tsconfig.scripts.json scripts/transition-ticket.ts com.dasmarinas.app DSM-000001 UNDER_REVIEW "Crew scheduled"
npx ts-node -P tsconfig.scripts.json scripts/transition-application.ts com.dasmarinas.app DSM-BRGY-000001 READY
npx ts-node -P tsconfig.scripts.json scripts/transition-assistance.ts com.dasmarinas.app DSM-AST-000001 APPROVED
```

## Tenant onboarding (new LGU)

1. Insert a tenant row + config JSON (Reference §3 contract) via the tenancy
   service (`config.upsert`) — brand colors, slogan, executive, onboarding
   slides, module flags, geo units, integrations.
2. Seed its data: hotlines, 311 categories→departments, service catalog +
   fees, assistance programs, POIs, transport routes, first posts/FAQs.
3. Add a variant to `mobile-application/tenant-variants.json` and build with
   `APP_VARIANT=<key>` — app name, bundle id, and everything on screen come
   from data.
