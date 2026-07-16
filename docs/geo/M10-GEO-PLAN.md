# M10 — Self-hosted Geo (maps without per-request API cost)

**Goal:** interactive maps with accurate, tenant-scoped pins — zero third-party
per-request billing. Geography follows the platform thesis: **the tenant's
boundary/facilities are data; the platform code has no per-tenant geo branch.**

## The three layers (own all of them)

1. **Basemap tiles** — self-hosted vector tiles (`.pmtiles`), a single static
   object on the **MinIO we already run**, fetched directly by the client via the
   PMTiles HTTP range protocol. No tile-server process, no per-tile billing.
   - *Production basemap* (streets/coastline): Planetiler → PH `.pmtiles` from a
     Geofabrik OSM extract (`scripts/geo/build-basemap.sh`). Run where egress to
     Geofabrik is allowed; upload the file to MinIO. **Documented ops step** —
     OSM data egress is blocked in this sandbox.
   - *Administrative basemap* (barangay boundaries + civic facilities): generated
     in-repo from the tenants' own GeoJSON via a pure-JS pipeline
     (`geojson-vt` → `vt-pbf` → `pmtiles`), proving the self-hosted serving path
     end-to-end without any external data. Ships now.
2. **Renderer** — MapLibre (open, free): `@maplibre/maplibre-react-native` on
   mobile (EAS dev build), MapLibre GL JS on web consoles.
3. **Geoservices** — a new **`geo-service`** (Mongo + `2dsphere`): tenant GeoJSON
   layers, point-in-polygon (which barangay), local reverse-geocode against the
   tenant gazetteer, features-in-bbox, boundary validation. All through the
   gateway → inherits tenant resolution + module flags. **No foreign geocoder.**

## Tenant isolation (the "no foreign data" rule)

- **Basemap is shared/neutral** (a road is a road) — one PH basemap for all.
- **Overlays are strictly tenant-scoped**: every feature carries `tenant_id`;
  every query is filtered by tenant AND clipped to the tenant boundary bbox;
  writes outside the boundary polygon are rejected (400). Search/reverse-geocode
  suggestions come only from the tenant's own gazetteer — never a global index.

## Storage upgrade

`{lat,lng}` embedded → GeoJSON `Point` + `2dsphere` (`location` field alongside
the existing `geo` for API back-compat). Replace the in-JS Haversine `nearby`
with `$near`. Add write-time `$geoWithin` boundary validation to reports & POIs.

## Endpoints (via gateway, tenant-scoped)

- `GET /v1/geo/style.json` — MapLibre style (points at the MinIO pmtiles + overlay source)
- `GET /v1/geo/boundary` — tenant boundary polygon + bbox + default center/zoom
- `GET /v1/geo/features?bbox=&layer=` — overlay features in view, tenant-clipped
- `GET /v1/geo/locate?lat=&lng=` — containing barangay + nearest facility (local reverse-geocode)
- `POST /v1/admin/geo/import` (tenant_admin, own tenant) — upload boundary/facility GeoJSON

## Verification

`geo-service` unit tests (point-in-polygon, bbox clip, boundary reject) +
`verify-e2e.ts` additions across all 3 tenants: boundary per tenant, locate
resolves a real barangay, report pin outside the polygon → 400, features bbox
returns only that tenant's data, tiles object serves bytes. Mobile: MapLibre
map on report (tap-to-pin) + tourism + a city map; tsc/jest/expo-export gates.

## Status (built)

**Backend — shipped.** `geo-service` (TCP 3019, Mongo `2dsphere`) with
`geo.boundary/validate/locate/features.bbox/import`; gateway public routes
`GET /v1/geo/{style.json,boundary,locate,features}` + admin
`POST/GET /v1/admin/tenants/:id/geo/{import,boundary}` (tenant-scoped via
`resolveTenantScope`). Report create now calls the geo-service to (a) reject a
pin outside the tenant boundary — **422** (semantically "well-formed but
unprocessable"; the plan said 400) — and (b) enrich the ticket with the
barangay resolved from the tenant's OWN gazetteer (no external geocoder).
Registered in `nest-cli.json`, `build:all`, `docker-compose.services.yml`
(target `geo-service`), and `seed:all` (`seed-geo.ts`).

**Self-hosted tiles — proven end-to-end.** `scripts/geo/build-admin-basemap.ts`
reads every tenant's own `geo_features`, slices MVTs (`geojson-vt` → `vt-pbf`),
and packs them into a **PMTiles v3** archive via an in-repo writer
(`apps/geo-service/src/pmtiles/pmtiles-archive.ts`), uploaded as one static
object to MinIO. The writer is validated by round-tripping through the official
`pmtiles` reader (header, metadata, per-tile bytes) in
`pmtiles-archive.spec.ts` — so the no-per-request-billing serving path is real,
not just planned. The production streets basemap (Planetiler/OSM) is the one
documented manual ops step, `scripts/geo/build-basemap.sh` (OSM egress is
blocked in-sandbox).

**Mobile — deviation, deliberate.** The in-app map is a **cross-platform
`react-native-svg` renderer** (`components/geo/civic-map.tsx`) that draws the
tenant's OWN boundary/barangays/facilities/pins fetched from the geo-service —
identical on iOS, Android, and `expo export` web, with no native module. This
was chosen over `@maplibre/maplibre-react-native` because the native SDK forces
an EAS dev build and breaks the managed-workflow web-export gate; the
MapLibre-style + PMTiles raster path is fully built server-side and remains the
production renderer upgrade. Wired into report tap-to-pin (with live
reverse-geocoded barangay + outside-boundary guard) and the tourism detail map.

**Verification run here:** backend `build:all` (16 apps) + `typecheck` + `lint`
green; `jest` 41/41 incl. 11 new geo tests (7 service tenant-isolation/spatial,
4 PMTiles round-trip); mobile `tsc --noEmit` green across the new geo
service/hooks/component + report/tourism integration; `verify-e2e.ts` extended
with a per-tenant geo block (boundary≈centroid, locate→barangay, null-island
outside, style.json pmtiles://, in-city features non-empty, foreign-city bbox
empty, outside-pin report 422). The live `verify-e2e` gate runs against the
containerized stack.
