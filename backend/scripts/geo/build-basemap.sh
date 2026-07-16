#!/usr/bin/env bash
#
# Production basemap bake (M10) — streets/coastline PH vector tiles as a single
# self-hosted .pmtiles object. Run this ONCE (or on an OSM refresh cadence) in an
# environment where egress to Geofabrik + Maven Central is allowed; the resulting
# file is a static object served by range request from the MinIO we already run,
# so there is NO tile server and NO per-request billing at runtime.
#
# This is the one deliberately-manual ops step: OSM data egress is blocked in the
# CI/dev sandbox (download.geofabrik.de → 403). The in-repo administrative basemap
# (scripts/geo/build-admin-basemap.ts) proves the identical serving path from the
# tenants' own geometry and ships automatically.
#
# Requirements: Java 21+ (Planetiler), curl, and the mc (MinIO client) or awscli.
#
# Usage:
#   scripts/geo/build-basemap.sh [region-url] [out.pmtiles]
# Env (defaults target the local compose MinIO):
#   S3_ENDPOINT   (default http://localhost:9000)
#   S3_ACCESS_KEY S3_SECRET_KEY
#   S3_BUCKET         (default civic-media)
#   GEO_BASEMAP_KEY   (default basemap/ph.pmtiles)
set -euo pipefail

REGION_URL="${1:-https://download.geofabrik.de/asia/philippines-latest.osm.pbf}"
OUT="${2:-ph.pmtiles}"
PLANETILER_JAR="${PLANETILER_JAR:-planetiler.jar}"
S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
S3_BUCKET="${S3_BUCKET:-civic-media}"
GEO_BASEMAP_KEY="${GEO_BASEMAP_KEY:-basemap/ph.pmtiles}"

if [ ! -f "$PLANETILER_JAR" ]; then
  echo "→ fetching Planetiler…"
  curl -fSL -o "$PLANETILER_JAR" \
    https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar
fi

echo "→ baking $REGION_URL → $OUT (this can take several minutes)…"
# --force overwrites; --download pulls the extract; output is a v3 .pmtiles archive.
java -Xmx4g -jar "$PLANETILER_JAR" \
  --download \
  --area=philippines \
  --osm-path="$REGION_URL" \
  --output="$OUT" \
  --force

echo "→ uploading $OUT → s3://$S3_BUCKET/$GEO_BASEMAP_KEY"
if command -v mc >/dev/null 2>&1; then
  mc alias set civicminio "$S3_ENDPOINT" "${S3_ACCESS_KEY:?}" "${S3_SECRET_KEY:?}" >/dev/null
  mc cp "$OUT" "civicminio/$S3_BUCKET/$GEO_BASEMAP_KEY"
else
  aws --endpoint-url "$S3_ENDPOINT" s3 cp "$OUT" "s3://$S3_BUCKET/$GEO_BASEMAP_KEY"
fi

echo "✓ basemap published. The style.json (GET /v1/geo/style.json) already points at it."
echo "  Swap streets on/off per tenant purely via config — no code change."
