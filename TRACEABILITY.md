# TRACEABILITY — Reference §10 living verification checklist

One row per Reference §10 entry. Status: ❌ todo · 🟡 built · ✅ verified (pass 1) ·
🔁 re-verified (pass 2: full flow on BOTH tenants — MyDasma `ph-cavite-dasmarinas` and
MySorsogon `ph-sorsogon-sorsogoncity` — with zero per-tenant code branches).

**Pass-2 evidence:** `backend/scripts/verify-e2e.ts` — 106 checks across both tenants,
run twice: against host-run services and against the full `docker compose` stack
(12 service containers + 4 infra) — **106/0 both times**. Mobile: 28 jest tests
(6 suites) including live-backend integration for both tenants, `tsc --noEmit`
clean, `expo export --platform web` builds 36 routes. Grep audits: zero tenant
strings in app/platform code (tenant data lives only in seeds, config rows, and
test inputs).

| # | Prototype screen / element | Backend endpoint(s) / event(s) | Mobile route / component | Status |
|---|---|---|---|---|
| 1 | Splash (logo, slogan, loading) | `GET /v1/config` (brand) | `app/index.tsx` startup gate (cached, never blocks on network) | 🔁 |
| 2 | Onboarding carousel (3 slides) | `GET /v1/config` (`onboarding[]`) | `app/(auth)/onboarding` | 🔁 |
| 3 | Login (+63), OTP entry + resend, Continue as Guest | `POST /v1/otp/request|verify`, `POST /v1/auth/guest|refresh` | `app/(auth)/login`, `app/(auth)/otp` | 🔁 |
| 4 | Home: greeting + avatar | `GET /v1/profile` | home header | 🔁 |
| 5 | Home: notification bell + unread badge | `GET /v1/notifications/unread-count` | home header bell | 🔁 |
| 6 | Home: search bar → search screen (recents, quick actions) | `GET /v1/search?q=` (federated, module-aware), `GET /v1/search/recent` | `app/search` (debounced sections, recents chips, quick actions) | 🔁 |
| 7 | Home: Emergency SOS bar + center SOS tab | `POST /v1/sos/sessions`, WS `/sos` | home SOS bar → `app/(tabs)/sos` | 🔁 |
| 8 | Home: 12-tile grid (incl. disabled "coming soon") | `GET /v1/config` (`modules`) | home grid (`lib/modules`); health/jobs config-off = dimmed coming-soon | 🔁 |
| 9 | Home: announcements carousel | `GET /v1/posts?pinned=true` (3 pinned) | home snap carousel | 🔁 |
| 10 | Home: Mayor's Corner (photo, greeting, slogan chip) | config `brand.executive` + `home.mayors_corner` | home card | 🔁 |
| 11 | Home: weather + AQI card | `GET /v1/weather` (tenant centroid) | home card | 🔁 |
| 12 | Home: nearby strip | `GET /v1/places?near=` (distance-sorted) | home strip (config centroid) | 🔁 |
| 13 | Home: digital-ID promo card | config `home.digital_id_promo` | home card | 🔁 |
| 14 | Services: grouped catalog with fees | `GET /v1/services` (fees are tenant data: CTC ₱100 vs ₱80) | `app/services` | 🔁 |
| 15 | Service flow: form → review (fees + ₱20) → GCash/card → QR claim stub | `POST /v1/applications` (`{PREFIX}-{SVC}-{seq}`), `POST /v1/payments` (idempotent, `{PREFIX}-OR-{yr}-{seq}`), PENDING_PAYMENT→PROCESSING→READY→CLAIMED | `app/services/[code]` flow + `applications/[stubId]` ladder | 🔁 |
| 16 | Report: 6 categories, photo, map pin, description | `GET /v1/reports/categories` (per-tenant dept routing), media presign→PUT→confirm (EXIF strip 2→0), `POST /v1/reports` (`{PREFIX}-######`) | `app/report` | 🔁 |
| 17 | Report: ticket no. + status timeline | `GET /v1/reports/:id` (audited actor+ts+note transitions) | `app/report/[ticketId]` step-timeline | 🔁 |
| 18 | Assistance: 5 programs, active-request tracker | `GET /v1/assistance/programs`, requests w/ checklists + claim scheduling (`{PREFIX}-AST-######`) | `app/assistance` + `[requestId]` | 🔁 |
| 19 | SOS: hold-to-activate, live location, quick links | `POST /v1/sos/sessions` (`{PREFIX}-SOS-######`, dispatch = tenant rescue org), WS `sos:location` ack+fan-out, HTTP fallback | `app/(tabs)/sos` (3s hold ring, LIVE badge, I'm-safe, native-dial degraded) | 🔁 |
| 20 | Hotlines: searchable, tap-to-call, org tags | `GET /v1/hotlines?tag=` | `app/hotlines` (offline-persisted query) | 🔁 |
| 21 | News feed: category chips, cards; detail w/ author | `GET /v1/posts?category=`, `GET /v1/posts/:id` | `app/news`, `app/news/[id]` | 🔁 |
| 22 | Tourism grid + detail (hours, rating, directions, ♥) | `GET /v1/places?kind=tourism` (open-now), `PUT/DELETE /v1/places/:id/favorite` | `app/tourism`, `app/tourism/[id]` (optimistic ♥, maps deep-link) | 🔁 |
| 23 | Directory: search, category, open/closed, rating, call | `GET /v1/places?kind=business` | `app/directory` | 🔁 |
| 24 | Transport: From→To finder, popular routes + fares | `GET /v1/transport/routes|match` (ordered-stop matcher) | `app/transport` | 🔁 |
| 25 | Notifications screen (read/unread) | `GET /v1/notifications`, mark read / read-all; populated by every status machine | `app/notifications` | 🔁 |
| 26 | More: profile, Digital City ID (QR, validity, verify) | `GET /v1/profile`, `GET /v1/digital-id` (rotating JWS), public `GET /v1/verify/:token` (tenant in signed payload) | `app/digital-id`, more tab | 🔁 |
| 27 | More: language toggle EN/FIL | config `locales`, `PATCH /v1/profile` language | more tab locale toggle + strings dictionary | 🔁 |
| 28 | More: settings, Help & FAQ, Send Feedback, log out | `GET /v1/faq?locale=`, `POST /v1/feedback`, `POST /v1/auth/logout` (instant revocation) | more tab, `app/faq`, `app/feedback` | 🔁 |
| 29 | Style-guide screen | design artifact — no backend | n/a | n/a |
| 30 | Toasts ("Calling…", "coming soon") | client-side UX | `components/ui/toast.tsx` | 🔁 |

## Cross-cutting re-verification proofs

| Proof | Evidence | Status |
|---|---|---|
| No per-tenant code branches | repo-wide grep: hits only in seed data, tenant-variants.json, test inputs, and a `curSOR-`/`adviSOR-` false positive | 🔁 |
| Module off for one tenant = inert; on for the other = live | transport flipped off for Sorsogon via config append (v↑): 403 + tile hidden there, 200 for MyDasma, restored — run on host AND compose stacks | 🔁 |
| IDs, theme, onboarding, Mayor's Corner from config | DSM-/SOR- prefixes on tickets, resident ids, claim stubs, ORs, AST, SOS; theme = runtime CSS vars; onboarding + executive rendered from fetched config | 🔁 |
| Auth: OTP→JWT, rotation, reuse-theft-kill, offline/429 never logs out, force-update fails open | verify-e2e checks + mobile token-refresh unit tests (transient-vs-dead) + force-update fail-open test | 🔁 |
| Status machines render audited timelines | 311 / e-gov / assistance ladders rendered from `timeline[]` (actor, timestamp, note); illegal transitions 409 | 🔁 |
| Append-only audit log on every status/payment event | `audit_events` collection populated via notification dispatch path | 🔁 |
| `docker compose up` brings the backend up clean | 4 infra + 12 service containers healthy; verify-e2e 106/0 against the compose gateway | 🔁 |
| App boots BOTH tenants purely from config | integration suites assert both bundle ids get correct name/colors/slogan/prefix from `/v1/config`; app renders exclusively from that payload; dev boot via `EXPO_PUBLIC_TENANT_BUNDLE_ID` | 🔁 |

## M9 — Admin plane, asset pipeline, consoles (added post-MVP-goal)

| Proof | Evidence | Status |
|---|---|---|
| Hierarchical authz: platform sees all tenants, tenant admin exactly one | verify-e2e admin section + both panel smokes | 🔁 |
| Cross-tenant writes 403; module toggles platform-only 403 for tenant admins | verify-e2e + tenant-panel read-only modules page | 🔁 |
| Admin/resident token planes mutually unusable | separate JWT_ADMIN_* secrets; verify-e2e 401 checks | 🔁 |
| Brand-asset pipeline: presign → MinIO → EXIF-strip/SVG-sanitize → config version → app payload → 200 | verify-e2e (seal URL 200) + mobile integration test (photo URL 200) + script-stripped SVG diff | 🔁 |
| Admin ops replace CLI scripts (audited actor=admin:role:id) | DSM ticket transitioned via /v1/admin, timeline actor recorded | 🔁 |
| Panels containerized and served with the stack | 19-container compose up; headless Chromium smoke vs :8090/:8091 (login, data, no cross-tenant leak) | 🔁 |
| Mobile renders admin-uploaded assets, falls back cleanly | 34 mobile tests incl. asset-url policy + live URL 200 | 🔁 |
| Full regression | scripts/verify-e2e.ts vs containerized stack: 115/0 | 🔁 |

## Design fidelity (Claude Design prototypes) + third tenant

| Proof | Evidence | Status |
|---|---|---|
| Design system extracted from the 3 prototypes | docs/designs/extracted/ (DESIGN_SPEC.md, 114 screen PNGs, tenant marks) | 🔁 |
| App restyled to the design system (Plus Jakarta Sans, gradient header w/ overlap search, floating tab bar w/ raised SOS, pastel tile chips, glow shadows, spec radii) | mobile-application/design-check/*.png vs screens/dasma/*.png — visual loop, verified side-by-side | 🔁 |
| Deliberate deviations kept (coming-soon tiles, settings/FAQ per §10, ₱20 added to total — prototype shows it un-added) | DESIGN_SPEC notes + code review | 🔁 |
| MyLegazpi onboarded as tenant #3 with ZERO platform-code change (admin API + Mayon SVG via asset pipeline + seed data) | config v2 w/ seal URL; only seeds/test-inputs/tenant-variants.json changed | 🔁 |
| Full regression across THREE tenants | scripts/verify-e2e.ts: 166 passed, 0 failed vs container stack | 🔁 |
