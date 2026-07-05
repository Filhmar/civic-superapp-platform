# TRACEABILITY — Reference §10 living verification checklist

One row per Reference §10 entry. Status: ❌ todo · 🟡 built · ✅ verified (pass 1) ·
🔁 re-verified (pass 2: full flow on BOTH tenants — MyDasma `ph-cavite-dasmarinas` and
MySorsogon `ph-sorsogon-sorsogoncity` — with zero per-tenant code branches).

| # | Prototype screen / element | Backend endpoint(s) / event(s) | Mobile route / component | Milestone | Status |
|---|---|---|---|---|---|
| 1 | Splash (logo, slogan, loading) | `GET /v1/config` (brand) | `app/index.tsx` startup gate | M0 | ✅ |
| 2 | Onboarding carousel (3 slides) | `GET /v1/config` (`onboarding[]`) | `app/(auth)/onboarding` | M0 | ✅ |
| 3 | Login (+63 mobile), OTP entry + resend, Continue as Guest | `POST /v1/otp/request`, `POST /v1/otp/verify`, `POST /v1/auth/guest`, `POST /v1/auth/refresh` | `app/(auth)/login`, `app/(auth)/otp` | M1 | ✅ |
| 4 | Home: greeting + avatar | `GET /v1/profile` | `app/(tabs)/index` header | M2 | ✅ |
| 5 | Home: notification bell + unread badge | `GET /v1/notifications/unread-count` | home header bell | M2 | ✅ |
| 6 | Home: search bar → search screen (recents, quick actions) | `GET /v1/search?q=` (federated), `GET /v1/search/recent` | `app/search` | M7 | 🟡 backend ✅ |
| 7 | Home: Emergency SOS bar + center SOS tab | `POST /v1/sos/sessions` + WS `/sos` namespace | `app/(tabs)/sos` | M6 | 🟡 backend ✅ |
| 8 | Home: 12-tile grid (incl. disabled "coming soon" tiles) | `GET /v1/config` (`modules`) | home module grid (`lib/modules`) | M2 | ✅ |
| 9 | Home: announcements carousel | `GET /v1/posts?pinned=true` | home carousel | M2 | ✅ |
| 10 | Home: Mayor's Corner card (photo, greeting, slogan chip) | `GET /v1/config` (`brand.executive`, `home.mayors_corner`) | home card | M2 | ✅ |
| 11 | Home: weather + AQI card | `GET /v1/weather` (per tenant centroid) | home card | M2 | ✅ |
| 12 | Home: nearby strip | `GET /v1/places?near=lat,lng` (distance-sorted) | home strip | M2/M7 | 🟡 backend ✅ |
| 13 | Home: digital-ID promo card | `GET /v1/config` (`home.digital_id_promo`) | home card | M2 | ✅ |
| 14 | Services: grouped catalog with fees | `GET /v1/services` | `app/services` | M4 | 🟡 backend ✅ |
| 15 | Service flow: form → review (fees + ₱20) → GCash/card → QR claim stub | `POST /v1/applications`, `POST /v1/payments` (idempotent, OR numbering), `GET /v1/applications/:stubId` (`{PREFIX}-{SVC}-{seq}`, PENDING_PAYMENT→PROCESSING→READY→CLAIMED) | `app/services/[code]` flow | M4 | 🟡 backend ✅ |
| 16 | Report: 6 categories, photo, map pin, description | `GET /v1/reports/categories` (dept routing per tenant), `POST /v1/media/presign`+confirm (EXIF strip), `POST /v1/reports` (`{PREFIX}-######`) | `app/report` | M3 | ✅ |
| 17 | Report: ticket no. + Submitted/Under Review/Resolved timeline | `GET /v1/reports/:id` (audited transitions) | `app/report/[ticketId]` | M3 | ✅ |
| 18 | Assistance: 5 programs, active-request tracker | `GET /v1/assistance/programs`, `POST/GET /v1/assistance/requests` (checklists, claim scheduling) | `app/assistance` | M5 | 🟡 backend ✅ |
| 19 | SOS: hold-to-activate, live location, quick links (Rescue/Police/Fire/Medical) | `POST /v1/sos/sessions`, WS `sos:location` (persist + dispatch fan-out), `GET /v1/hotlines?tag=` | `app/(tabs)/sos` | M6 | 🟡 backend ✅ |
| 20 | Hotlines: searchable, tap-to-call, org tags | `GET /v1/hotlines` (offline-cached) | `app/hotlines` | M6 | 🟡 backend ✅ |
| 21 | News feed: category chips, cards; article detail w/ author | `GET /v1/posts?category=`, `GET /v1/posts/:id` | `app/news`, `app/news/[id]` | M2 | ✅ |
| 22 | Tourism grid + detail (hours, rating, map, directions, favorite ♥) | `GET /v1/places?kind=tourism` (open-now computed), `PUT/DELETE /v1/places/:id/favorite` | `app/tourism`, `app/tourism/[id]` | M7 | 🟡 backend ✅ |
| 23 | Directory: search, category, open/closed, rating, call | `GET /v1/places?kind=business` | `app/directory` | M7 | 🟡 backend ✅ |
| 24 | Transport: route finder From→To, popular routes + fares | `GET /v1/transport/routes`, `GET /v1/transport/match?from=&to=` | `app/transport` | M7 | 🟡 backend ✅ |
| 25 | Notifications screen (read/unread) | `GET /v1/notifications`, `POST /v1/notifications/:id/read`, read-all | `app/notifications` | M2 | ✅ |
| 26 | More: profile, Digital City ID (QR, validity, verify) | `GET /v1/profile`, `GET /v1/digital-id` (rotating JWS QR), public `GET /v1/verify/:token` | `app/digital-id`, more tab | M1/M7 | ✅ |
| 27 | More: language toggle EN/FIL | `GET /v1/config` (`locales`), `PATCH /v1/profile` (language) | more screen | M8 | 🟡 backend ✅ |
| 28 | More: settings, Help & FAQ, Send Feedback, log out | `GET /v1/faq?locale=`, `POST /v1/feedback`, `POST /v1/auth/logout` | more screen | M8 | 🟡 backend ✅ |
| 29 | Style-guide screen | design artifact — no backend | — (not in app scope) | — | n/a |
| 30 | Toasts ("Calling…", "coming soon") | client-side UX — no backend | `components/ui/toast.tsx` | M2 | ✅ |

## Cross-cutting re-verification proofs (recorded per milestone)

| Proof | Evidence | Status |
|---|---|---|
| No per-tenant code branches | grep of app + backend code: tenant strings only in seed/data files and test inputs (M0–M3 passes) | ✅ (re-run at final audit) |
| Module off for one tenant = hidden+inert; on for the other = live (same code) | news toggled off for Sorsogon via config v2 → `/v1/posts` 403 + `modules.news=false` in config; Dasma unaffected; restored v3 | ✅ |
| IDs, theme, onboarding, Mayor's Corner all originate from config | DSM-/SOR- prefixes on tickets, resident ids, stubs, ORs, SOS; theme = runtime CSS vars from config; onboarding + executive rendered from config | ✅ |
| OTP→JWT works; refresh rotates; reuse detected; offline/429 does NOT log out; force-update fails open | rotation + reuse-theft-kill verified over HTTP; transient-vs-dead unit tests; force-update fails open (unit) | ✅ |
| Status machines render timelines from audited transitions | 311: SUBMITTED→UNDER_REVIEW→RESOLVED w/ actor+ts+note; egov: PENDING_PAYMENT→…→CLAIMED; assistance: →APPROVED w/ claim schedule | ✅ |
| Append-only audit log receives every status/payment event | `audit_events` in Mongo populated by reports/egov/assistance transitions | ✅ |
| Live SOS WebSocket stream | 3 fixes acked over `/sos`, dispatch-room fan-out, persisted (count 4) | ✅ |
| `docker compose up` brings backend up clean | infra compose ✅ (postgres/mongo/redis/minio healthy); service containers pending | 🟡 |
| App boots BOTH tenants purely from config | config integration tests pass for both bundle ids; full-app boot check at final audit | 🟡 |
