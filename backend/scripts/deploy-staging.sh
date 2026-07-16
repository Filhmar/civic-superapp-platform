#!/usr/bin/env bash
# Staging deploy (build-on-box). Invoked by .github/workflows/deploy-staging.yml
# on the self-hosted runner labeled `staging`. Builds every image locally from
# source, brings the stack up under an isolated compose project on REMAPPED host
# ports (so it coexists with production on the same box), then smoke-tests the
# gateway. No registry, no signing: the box that builds is the box that runs.
set -euo pipefail

# Repo root (this script lives in backend/scripts/).
cd "$(dirname "$0")/.."

# ── Isolation + environment ──────────────────────────────────────────────────
# Separate compose project => separate containers, network and volumes from prod.
export COMPOSE_PROJECT_NAME=civic-staging
# App env: the codebase models `staging` as a first-class NODE_ENV (config.schema
# enum), which keeps prod-like behavior while still allowing mock OTP in staging.
export NODE_ENV=staging
# Point every app container at the staging secrets file (see docker-compose.services.yml).
# Kept OUTSIDE the runner checkout: actions/checkout runs `git clean -ffdx`, which
# would delete an untracked env file placed in the work tree. Absolute path survives.
export ENV_FILE="${ENV_FILE:-/etc/civic/.env.staging}"
# Staging host ports: the 7xxx block, verified free against everything else
# already running on this shared box (youflow/smis/usapp stacks). All published
# on 127.0.0.1 by the compose files — reach them via a reverse proxy, never public.
# NB: these are *host-publish* ports only (the *_HOST_PORT suffix keeps them from
# colliding with the app's own config keys like API_GATEWAY_PORT/REDIS_PORT, which
# stay at their in-container defaults 3005/6379). Do NOT put these in .env.staging.
export GATEWAY_HOST_PORT=7005
export TENANCY_HOST_PORT=7006
export PLATFORM_ADMIN_HOST_PORT=7090
export TENANT_ADMIN_HOST_PORT=7091
export POSTGRES_HOST_PORT=7432
export MONGO_HOST_PORT=7017
export REDIS_HOST_PORT=7379
export MINIO_HOST_PORT=7900
export MINIO_CONSOLE_HOST_PORT=7901

HEALTH_PORT="${GATEWAY_HOST_PORT}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.services.yml)

log()  { printf '\n\033[1;34m[deploy-staging]\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31m[deploy-staging] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "missing ${ENV_FILE} on the box — create it from .env.example (chmod 600)"

# S3_PUBLIC_ENDPOINT is baked into the media URLs the mobile app fetches. It lives
# in the compose `environment` block (which overrides env_file), so lift it from the
# env file into the interpolation environment. Set it in ${ENV_FILE} to your media
# subdomain, e.g. S3_PUBLIC_ENDPOINT=https://media.staging.example.com
# `|| true`: under `set -euo pipefail`, a no-match grep exits 1 and would abort the
# whole deploy — tolerate a missing key here and fall through to the warning below.
S3_PUBLIC_ENDPOINT="$(grep -E '^S3_PUBLIC_ENDPOINT=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '\r' || true)"
export S3_PUBLIC_ENDPOINT
[ -n "$S3_PUBLIC_ENDPOINT" ] || log "WARNING: S3_PUBLIC_ENDPOINT unset in ${ENV_FILE} — media URLs fall back to localhost and the mobile app cannot load media."

log "Building images from source"
"${COMPOSE[@]}" build

log "Starting stack (project ${COMPOSE_PROJECT_NAME}; app containers run prisma migrate deploy on boot)"
"${COMPOSE[@]}" up -d --remove-orphans

# ── Smoke test ───────────────────────────────────────────────────────────────
# The gateway sets a global prefix `v1` (main.ts), so health lives at /v1/health.
# It returns 200 {"status":"ok"} only when Redis + tenancy are reachable, and
# "degraded" while dependencies warm up — wait for "ok".
log "Smoke: waiting for gateway health on :${HEALTH_PORT}/v1/health"
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${HEALTH_PORT}/v1/health" 2>/dev/null | grep -q '"status":"ok"'; then
    log "Gateway healthy. Staging deploy complete."
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 5
done

log "Smoke FAILED — gateway did not report healthy in time. Recent gateway logs:"
"${COMPOSE[@]}" logs --tail=80 api-gateway || true
fail "staging deploy failed smoke test (containers left running for inspection)"
