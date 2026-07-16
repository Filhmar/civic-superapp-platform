#!/usr/bin/env bash
# Production deploy (build-on-box). Invoked manually via
# .github/workflows/deploy.yml on the self-hosted runner labeled `production`
# (same box as staging, isolated by compose project name + base host ports).
# Builds every image locally from source, brings the stack up, smoke-tests the
# gateway. No registry, no signing: the box that builds is the box that runs.
#
# No auto-rollback (simplest model): a failed smoke test leaves the (already
# built + started) stack running for inspection and exits non-zero. Because the
# build runs before `up`, a build failure never touches the running stack.
set -euo pipefail

# Repo root (this script lives in backend/scripts/).
cd "$(dirname "$0")/.."

# ── Isolation + environment ──────────────────────────────────────────────────
export COMPOSE_PROJECT_NAME=civic-prod
# Production: isProduction=true (hardening on) and mock OTP driver is rejected by
# config.schema — .env.production must set a real OTP_DELIVERY_DRIVER.
export NODE_ENV=production
# Kept OUTSIDE the runner checkout (actions/checkout `git clean -ffdx` would delete
# an untracked env file in the work tree). Absolute path survives. Override if needed.
export ENV_FILE="${ENV_FILE:-/etc/civic/.env.production}"
# Production host ports: the 6xxx block, verified free against everything else
# already running on this shared box (the compose defaults 3005/27017/9000 are
# taken by other stacks). All published on 127.0.0.1 — front with a reverse proxy.
# NB: these are *host-publish* ports only (the *_HOST_PORT suffix keeps them from
# colliding with the app's own config keys like API_GATEWAY_PORT/REDIS_PORT, which
# stay at their in-container defaults 3005/6379). Do NOT put these in .env.production.
export GATEWAY_HOST_PORT=6005
export TENANCY_HOST_PORT=6006
export PLATFORM_ADMIN_HOST_PORT=6090
export TENANT_ADMIN_HOST_PORT=6091
export POSTGRES_HOST_PORT=6432
export MONGO_HOST_PORT=6017
export REDIS_HOST_PORT=6379
export MINIO_HOST_PORT=6900
export MINIO_CONSOLE_HOST_PORT=6901

HEALTH_PORT="${GATEWAY_HOST_PORT}"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.services.yml)

log()  { printf '\n\033[1;34m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31m[deploy] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "missing ${ENV_FILE} on the box — create it from .env.example (chmod 600)"

# S3_PUBLIC_ENDPOINT is baked into the media URLs the mobile app fetches. It lives
# in the compose `environment` block (which overrides env_file), so lift it from the
# env file into the interpolation environment. Set it in ${ENV_FILE} to your media
# subdomain, e.g. S3_PUBLIC_ENDPOINT=https://media.example.com
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
# Gateway sets a global prefix `v1` (main.ts), so health lives at /v1/health.
log "Smoke: waiting for gateway health on :${HEALTH_PORT}/v1/health"
for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:${HEALTH_PORT}/v1/health" 2>/dev/null | grep -q '"status":"ok"'; then
    log "Gateway healthy. Production deploy complete."
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 5
done

log "Smoke FAILED — gateway did not report healthy in time. Recent gateway logs:"
"${COMPOSE[@]}" logs --tail=80 api-gateway || true
fail "production deploy failed smoke test (containers left running for inspection)"
