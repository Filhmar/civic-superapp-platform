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
