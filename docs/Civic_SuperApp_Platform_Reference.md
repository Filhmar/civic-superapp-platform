# Civic Super-App Platform — Backend Reference

**One platform, many LGUs.** This project already runs as two branded clients of the same system — **MyDasma** (Dasmariñas, Cavite) and **MySorsogon** (Sorsogon City) — with identical UX and flows but different branding, content, and data. This document specifies the microservices backend for that platform so any city, municipality, province, or region can be onboarded as a **tenant**.

Proof of pattern (what changed between the two tenants — and therefore what must be data, never code):

| Dimension | MyDasma | MySorsogon |
|---|---|---|
| Theme tokens | green `#1E8449` / gold `#F1C40F` | marian blue `#1B4F9C` / heart red `#D62839` |
| Identity mark | butterfly (paru-paró) | official city seal + butanding motif |
| Slogan | "Sulong na! Sulong pa!" | "Taas-Noo, Ciudadano Ako!" |
| Chief executive | Hon. Jenny Austria-Barzaga | Hon. Ma. Ester E. Hamor |
| Ticket/ID prefix | `DSM-` | `SOR-` |
| Geo units, hotlines, POIs, news, fees, festivals | Dasmariñas set | Sorsogon set |

Everything else — screens, flows, status machines, payments — is shared platform code.

---

## 1. Architecture at a glance

```
Mobile apps (white-label builds)      Staff web console      Public QR verify page
            │                                │                        │
            └────────────► API Gateway / BFF (tenant resolution) ◄────┘
                                     │
   ┌──────────┬──────────┬──────────┼──────────┬───────────┬──────────┐
 Tenancy   Identity    e-Gov     Reports    Assistance  Emergency   Content
 (control  & Profile  +Payments   (311)      (CSWD)     (SOS+lines) (PIO CMS)
  plane)       │          │          │           │           │          │
   └──────────┴──────────┴───── Event bus (Kafka/NATS) ─────┴──────────┘
                                     │
        Places · Transport · Notifications · Media · Search · Integrations · Analytics
```

- **Control plane**: tenant lifecycle, config, theming, module toggles, billing.
- **Data plane**: domain services, all rows scoped by `tenant_id`.

## 2. Tenancy model

- `tenant(id, kind: city|municipality|province|region, parent_tenant_id?, status)`
- **Hierarchy**: a province tenant may parent city tenants → enables cross-posting advisories downward and rolled-up dashboards upward (e.g. a Cavite province tenant sees Dasmariñas 311 volumes). Regional tenants aggregate provinces.
- **Isolation tiers** (pick per contract size):
  1. Shared DB + Postgres row-level security on `tenant_id` (default),
  2. Schema-per-tenant,
  3. Dedicated cluster (mega-city / province-wide deployments).
- **Tenant resolution**: mobile builds pin `X-Tenant-ID`; staff console via subdomain (`dasma.platform.ph`); QR verify pages carry tenant in the signed payload.

## 3. Tenant configuration (Config service)

Single versioned JSON per tenant; the app boots entirely from this:

```jsonc
{
  "tenant_id": "ph-cavite-dasmarinas",
  "app": { "name": "MyDasma", "tagline": "Ang Lungsod sa Iyong Palad" },
  "brand": {
    "colors": { "primary": "#1E8449", "primaryDark": "#14532D", "accent": "#F1C40F",
                "accentDeep": "#D4A017", "danger": "#E53935", "tint": "#E8F5E9" },
    "logo": { "type": "svg|image", "assets": { "seal": "...", "mascot": "...", "watermark": "..." } },
    "slogan": "Sulong na! Sulong pa!",
    "executive": { "title": "City Mayor", "name": "...", "photo": "...", "greeting": "..." }
  },
  "identifiers": { "ticket_prefix": "DSM", "resident_id_prefix": "DSM" },
  "geo": { "centroid": [14.3294, 120.9367], "units": ["Zone I", "Salitran IV", "Paliparan", "..."] },
  "locales": ["en", "fil"],
  "onboarding": [ { "title": "...", "body": "...", "bg": "...", "image": "..." } ],  // 3 carousel slides
  "home": { "mayors_corner": true, "digital_id_promo": true },
  "modules": { "egov": true, "reports311": true, "assistance": true, "sos": true,
               "news": true, "tourism": true, "directory": true, "transport": true,
               "health": false, "jobs": false },
  "integrations": { "weather": "openweather", "sms": "semaphore", "payments": ["gcash","card"] }
}
```

## 4. Tenant onboarding pipeline (productize the Dasma→Sorsogon rebrand)

1. **Provision** tenant record + config skeleton; assign isolation tier.
2. **Brand kit intake**: seal/logo (transparent PNG/SVG), palette (or derive from seal), slogan, executive photo + message, festival/identity line.
3. **Data seeds** (CSV/admin console): barangays/districts, hotlines (org, tag, numbers), service catalog + fees, report categories → department routing, assistance programs, POIs (tourism/business/civic) with photos, transport routes + fares.
4. **Content**: PIO accounts, first advisories/news with images.
5. **Build & assets**: white-label mobile build (app name, icon, splash from config), marketing kit (poster, deck) generated from the same config.
6. **QA gate**: automated checklist — every module either enabled-with-data or hidden (prototype's "coming soon" tiles = `modules.x=false`).
7. **Go-live**: DNS, store listing, staff training, hypercare dashboards.

Target: **new city onboarded in days, not months** — the prototype rebrand took hours.

## 5. Domain services (shared by all tenants)

All rows carry `tenant_id`; all IDs use the tenant prefix (`{PREFIX}-######`).

### 5.1 Identity & Profile
- OTP by SMS (`POST /otp/request|verify`), guest sessions (browse-only scope), JWT.
- **Digital Resident ID**: `{PREFIX}-{year}-{seq}`, signed rotating QR (JWS); public verify endpoint returns name, unit (barangay), `verified_resident`, validity — nothing else.
- Profile: name, unit, language, avatar; preferences.

### 5.2 e-Gov Services & Payments
- Per-tenant catalog (taxes, permits, civil registry, clearances) with fees + requirements.
- Application flow: draft → submit → quote → pay → **QR claim stub** (`{PREFIX}-{svc}-{seq}`, window no., ready ETA, `PENDING_PAYMENT → PROCESSING → READY → CLAIMED`).
- Payments service: GCash/card adapters (PayMongo/Xendit-class), convenience fee rules per tenant, idempotency keys, official receipt numbering per LGU ordinance, treasury settlement exports, refunds.

### 5.3 Reports (311)
- Ticket: category, photos, geo pin, description → `{PREFIX}-{6 digits}`.
- Status machine `SUBMITTED → UNDER_REVIEW → RESOLVED|REJECTED`, every transition audited (actor, timestamp) to render the app's timeline.
- Category→department routing table per tenant (pothole→Engineering, garbage→ENRO, …).

### 5.4 Assistance (social services)
- Programs per tenant (medical, financial/livelihood, educational, transport/ambulance, burial).
- `SUBMITTED → UNDER_REVIEW → APPROVED|DENIED` + claim scheduling; requirement checklists.

### 5.5 Emergency
- **SOS sessions**: hold-to-activate → session with live location stream (WebSocket/MQTT), routed to that tenant's dispatch (CDRRMO/911 bridge). Separate availability budget; degraded mode = native dial.
- **Hotlines**: per-tenant directory (rescue, police, fire, hospitals, utilities), cached offline.

### 5.6 Content (PIO CMS)
- Posts with categories (ADVISORY, EVENT, PROGRAM, GOVERNANCE, TOURISM, JOBS…), hero media, scheduling, pinning; barangay-targeted advisories; publish → mass push.
- Pinned/top-3 posts power the home **announcements carousel**; full feed powers the News tab with category filter chips.
- **Help & FAQ** entries (per tenant, per locale) and **feedback intake** (`POST /feedback` → staff console inbox) live here too.
- Cross-tenant: parent (province) can push advisories to child cities.

### 5.7 Places (tourism + business directory + nearby)
- One POI store, `kind: tourism|business|civic`; photos, hours (open-now computed), rating, geo, contact. Feeds the home "nearby" strip, tourism grid, and directory list.
- **Favorites**: `PUT/DELETE /places/{id}/favorite` per user (the heart action on tourism detail); "Get Directions" deep-links to maps with stored geo.

### 5.8 Transport
- Routes (jeepney/tricycle/UV/van/ferry), terminals, fares; simple From→To matcher, GTFS-ready.

### 5.9 Notifications
- In-app inbox + FCM/APNs push; templates in tenant locales; subscribes to all status-change events; unread badge endpoint.

### 5.10 Media
- Presigned uploads (S3-class), EXIF strip, size caps; used by 311 photos, CMS, POIs, brand kit.

### 5.11 Search
- Federated per tenant (catalog, places, news, hotlines) via OpenSearch/Meilisearch, event-fed.
- Per-user **recent searches** + curated quick actions (report, hotlines, tourism) as shown on the search screen.

### 5.12 Integrations
- Weather/AQI poller per tenant centroid; SMS aggregator per country/tenant; future adapters (COMELEC, SEC advisories, PAGASA feeds).

### 5.13 Analytics & Audit
- Append-only audit log (COA compliance) for payments and status transitions.
- Tenant dashboards (ticket volumes, SLA, revenue) + parent-tenant rollups.

## 6. Platform-operator concerns (you, the vendor)

- **Billing/SLA tiers** per tenant: Basic (news+hotlines+311) / Standard (+e-gov, payments) / Full (+SOS realtime, assistance, digital ID). Module flags enforce tier.
- **Release management**: platform-versioned APIs (`/v1`), config-driven features so one release train serves all tenants; canary by tenant.
- **App-store strategy**: one white-label build per tenant (own icon/name — as MyDasma and MySorsogon exist separately) generated by CI from tenant config; optionally an umbrella "national" app with tenant picker later.
- **Staff console**: multi-tenant web app; roles: `pio_editor`, `dept_staff`, `cswd_officer`, `treasurer`, `dispatcher`, `lgu_admin`, `platform_admin`.
- **Compliance**: RA 10173 (Data Privacy), consent capture, SOS location retention (~30 days), per-tenant data residency and export/erasure on offboarding.

## 7. Event catalog

```
tenancy.tenant.provisioned|updated      identity.user_verified
egov.application.submitted|ready        payments.payment.completed|failed
reports.ticket.created|status_changed   assistance.request.submitted|decided
content.advisory.published              emergency.sos.opened|closed
places.poi.updated                      notifications.dispatched
```

## 8. Suggested stack

- **Services**: NestJS (TS) or Spring Boot; REST external, gRPC internal; OpenAPI-first.
- **Data**: Postgres (RLS multi-tenancy) · Redis (OTP/session/cache) · S3-compatible storage · OpenSearch · Kafka or NATS JetStream · WebSocket gateway for SOS/live status.
- **Infra**: Kubernetes (namespace per isolation tier), Terraform, GitHub Actions (matrix builds per tenant app), OpenTelemetry + Grafana/Loki.
- **Mobile**: single React Native / Flutter codebase, tenant config baked at build + fetched at boot.

## 9. Build order

1. **M0** — Tenancy control plane + Config + Gateway (tenant resolution, module flags).
2. **M1** — Identity (OTP/guest/JWT) + Profile.
3. **M2** — Content CMS + Notifications + Weather → live branded home.
4. **M3** — Reports 311 + Media (first civic loop; matches prototype ticket flow).
5. **M4** — e-Gov catalog + Payments + QR stubs (revenue).
6. **M5** — Assistance + staff console.
7. **M6** — Emergency SOS realtime + hotlines.
8. **M7** — Places, Transport, Search, Digital ID verify.
9. **M8** — Hierarchical tenants (province/region rollups), analytics, billing tiers, tenant CI pipeline.

## 10. UI → backend traceability (every screen in the prototype)

| Prototype screen / element | Covered in |
|---|---|
| Splash (logo, slogan, loading) | §3 brand |
| Onboarding carousel (3 slides) | §3 `onboarding[]` |
| Login (+63 mobile), OTP entry + resend, Continue as Guest | §5.1 |
| Home: greeting + avatar | §5.1 Profile |
| Home: notification bell + unread badge | §5.9 |
| Home: search bar → search screen (recents, quick actions) | §5.11 |
| Home: Emergency SOS bar + center SOS tab | §5.5 |
| Home: 12-tile grid (incl. disabled Health/Jobs "coming soon") | §3 `modules` |
| Home: announcements carousel | §5.6 |
| Home: Mayor's Corner card (photo, greeting, slogan chip) | §3 `brand.executive`, `home.mayors_corner` |
| Home: weather + AQI card | §5.12 |
| Home: nearby strip | §5.7 |
| Home: digital-ID promo card | §3 `home.digital_id_promo`, §5.1 |
| Services: grouped catalog with fees | §5.2 |
| Service flow: form → review (fees + ₱20) → GCash/card → QR claim stub | §5.2 |
| Report: 6 categories, photo, map pin, description | §5.3 + §5.10 |
| Report: ticket no. + Submitted/Under Review/Resolved timeline | §5.3 |
| Assistance: 5 programs, active-request tracker | §5.4 |
| SOS: hold-to-activate, live location, quick links (Rescue/Police/Fire/Medical) | §5.5 |
| Hotlines: searchable, tap-to-call, org tags | §5.5 |
| News feed: category chips, cards; article detail w/ author (City PIO) | §5.6 |
| Tourism grid + detail (hours, rating, map, directions, favorite ♥) | §5.7 |
| Directory: search, category, open/closed, rating, call | §5.7 |
| Transport: route finder From→To, popular routes + fares | §5.8 |
| Notifications screen (read/unread) | §5.9 |
| More: profile, Digital City ID (QR, validity, verify) | §5.1 |
| More: language toggle EN/FIL | §3 `locales`, §5.1 prefs |
| More: settings, Help & FAQ, Send Feedback, log out | §5.1, §5.6 |
| Style-guide screen | design artifact — no backend |
| Toasts ("Calling…", "coming soon") | client-side UX — no backend |

---
*Derived from the working two-tenant prototype in this project: `MyDasma.dc.html` and `MySorsogon.dc.html` — every flow above ships in those designs; every difference between them is captured in §3's tenant config.*
