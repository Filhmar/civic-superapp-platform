# One multi-stage build for all 12 services (STACK.md §10).
ARG NODE_IMAGE=node:22.22-alpine3.23

FROM ${NODE_IMAGE} AS base
# CVE refresh of the base image; non-fatal so sandboxed/offline builds still work.
RUN apk upgrade --no-cache || echo "apk upgrade skipped (no repo access)"
WORKDIR /app

# --- deps: full install (dev) + prisma clients -------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY libs ./libs
COPY apps ./apps
RUN npm run prisma:generate

# --- build: compile every service --------------------------------------------
FROM deps AS build
RUN npm run build:all

# --- prod-deps: prune the dev install to runtime deps ------------------------
# (a second `npm ci --omit=dev` intermittently crashes npm; pruning the
#  already-verified tree is equivalent and keeps the generated Prisma clients)
FROM deps AS prod-deps
RUN npm prune --omit=dev --no-audit --no-fund

# --- runtime base: non-root, prod deps ----------------------------------------
FROM base AS runtime-base
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./

FROM runtime-base AS api-gateway
COPY --from=build /app/dist/apps/api-gateway ./dist/apps/api-gateway
USER appuser
EXPOSE 3005
CMD ["node", "dist/apps/api-gateway/main.js"]

FROM runtime-base AS tenancy-service
COPY --from=build /app/dist/apps/tenancy-service ./dist/apps/tenancy-service
COPY --from=prod-deps /app/apps/tenancy-service ./apps/tenancy-service
USER appuser
EXPOSE 3006
CMD ["sh", "-c", "npx prisma migrate deploy --config apps/tenancy-service/prisma.config.ts && node dist/apps/tenancy-service/main.js"]

FROM runtime-base AS identity-service
COPY --from=build /app/dist/apps/identity-service ./dist/apps/identity-service
COPY --from=prod-deps /app/apps/identity-service ./apps/identity-service
USER appuser
EXPOSE 3007
CMD ["sh", "-c", "npx prisma migrate deploy --config apps/identity-service/prisma.config.ts && node dist/apps/identity-service/main.js"]

FROM runtime-base AS egov-service
COPY --from=build /app/dist/apps/egov-service ./dist/apps/egov-service
COPY --from=prod-deps /app/apps/egov-service ./apps/egov-service
USER appuser
EXPOSE 3008
CMD ["sh", "-c", "npx prisma migrate deploy --config apps/egov-service/prisma.config.ts && node dist/apps/egov-service/main.js"]

FROM runtime-base AS reports-service
COPY --from=build /app/dist/apps/reports-service ./dist/apps/reports-service
USER appuser
EXPOSE 3009
CMD ["node", "dist/apps/reports-service/main.js"]

FROM runtime-base AS assistance-service
COPY --from=build /app/dist/apps/assistance-service ./dist/apps/assistance-service
USER appuser
EXPOSE 3010
CMD ["node", "dist/apps/assistance-service/main.js"]

FROM runtime-base AS emergency-service
COPY --from=build /app/dist/apps/emergency-service ./dist/apps/emergency-service
USER appuser
EXPOSE 3011
CMD ["node", "dist/apps/emergency-service/main.js"]

FROM runtime-base AS content-service
COPY --from=build /app/dist/apps/content-service ./dist/apps/content-service
USER appuser
EXPOSE 3012
CMD ["node", "dist/apps/content-service/main.js"]

FROM runtime-base AS places-service
COPY --from=build /app/dist/apps/places-service ./dist/apps/places-service
USER appuser
EXPOSE 3013
CMD ["node", "dist/apps/places-service/main.js"]

FROM runtime-base AS notification-service
COPY --from=build /app/dist/apps/notification-service ./dist/apps/notification-service
USER appuser
EXPOSE 3014
CMD ["node", "dist/apps/notification-service/main.js"]

# media-service: sharp bundles a prebuilt libvips via npm (@img/sharp-libvips);
# system vips is only a fallback for exotic platforms, so its install is non-fatal.
FROM runtime-base AS media-service
USER root
RUN apk add --no-cache vips || echo "system vips skipped (sharp bundles libvips)"
COPY --from=build /app/dist/apps/media-service ./dist/apps/media-service
USER appuser
EXPOSE 3016
CMD ["node", "dist/apps/media-service/main.js"]

FROM runtime-base AS integration-service
COPY --from=build /app/dist/apps/integration-service ./dist/apps/integration-service
USER appuser
EXPOSE 3017
CMD ["node", "dist/apps/integration-service/main.js"]
