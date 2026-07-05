# TRACEABILITY — Reference §10 living verification checklist

One row per Reference §10 entry. Status: ❌ todo · 🟡 built · ✅ verified (pass 1) ·
🔁 re-verified (pass 2: full flow on BOTH tenants — MyDasma `ph-cavite-dasmarinas` and
MySorsogon `ph-sorsogon-sorsogoncity` — with zero per-tenant code branches).

| # | Prototype screen / element | Backend endpoint(s) / event(s) | Mobile route / component | Milestone | Status |
|---|---|---|---|---|---|
| 1 | Splash (logo, slogan, loading) | `GET /v1/config` (brand) | `app/index.tsx` startup gate | M0 | ❌ |
| 2 | Onboarding carousel (3 slides) | `GET /v1/config` (`onboarding[]`) | `app/(auth)/onboarding` | M0 | ❌ |
| 3 | Login (+63 mobile), OTP entry + resend, Continue as Guest | `POST /v1/otp/request`, `POST /v1/otp/verify`, `POST /v1/auth/guest`, `POST /v1/auth/refresh` | `app/(auth)/login`, `app/(auth)/otp` | M1 | ❌ |
| 4 | Home: greeting + avatar | `GET /v1/profile` | `app/(tabs)/index` header | M2 | ❌ |
| 5 | Home: notification bell + unread badge | `GET /v1/notifications/unread-count` | home header bell | M2 | ❌ |
| 6 | Home: search bar → search screen (recents, quick actions) | `GET /v1/search?q=`, `GET/POST /v1/search/recent` | `app/search` | M7 | ❌ |
| 7 | Home: Emergency SOS bar + center SOS tab | `POST /v1/sos/sessions` + WS location stream | `app/(tabs)/sos` | M6 | ❌ |
| 8 | Home: 12-tile grid (incl. disabled "coming soon" tiles) | `GET /v1/config` (`modules`) | home module grid | M2 | ❌ |
| 9 | Home: announcements carousel | `GET /v1/posts?pinned=true` | home carousel | M2 | ❌ |
| 10 | Home: Mayor's Corner card (photo, greeting, slogan chip) | `GET /v1/config` (`brand.executive`, `home.mayors_corner`) | home card | M2 | ❌ |
| 11 | Home: weather + AQI card | `GET /v1/weather` (per tenant centroid) | home card | M2 | ❌ |
| 12 | Home: nearby strip | `GET /v1/places?nearby=` | home strip | M2/M7 | ❌ |
| 13 | Home: digital-ID promo card | `GET /v1/config` (`home.digital_id_promo`) | home card | M2 | ❌ |
| 14 | Services: grouped catalog with fees | `GET /v1/services` | `app/services` | M4 | ❌ |
| 15 | Service flow: form → review (fees + ₱20) → GCash/card → QR claim stub | `POST /v1/applications`, `POST /v1/payments`, `GET /v1/applications/:id` (`{PREFIX}-{svc}-{seq}`, PENDING_PAYMENT→…→CLAIMED) | `app/services/[id]` flow | M4 | ❌ |
| 16 | Report: 6 categories, photo, map pin, description | `GET /v1/reports/categories`, `POST /v1/media/presign`, `POST /v1/reports` (`{PREFIX}-######`) | `app/report` | M3 | ❌ |
| 17 | Report: ticket no. + Submitted/Under Review/Resolved timeline | `GET /v1/reports/:id` (audited transitions) | `app/report/[id]` | M3 | ❌ |
| 18 | Assistance: 5 programs, active-request tracker | `GET /v1/assistance/programs`, `POST /v1/assistance/requests`, `GET /v1/assistance/requests` | `app/assistance` | M5 | ❌ |
| 19 | SOS: hold-to-activate, live location, quick links (Rescue/Police/Fire/Medical) | `POST /v1/sos/sessions`, WS `sos.location`, `GET /v1/hotlines?tag=` | `app/(tabs)/sos` | M6 | ❌ |
| 20 | Hotlines: searchable, tap-to-call, org tags | `GET /v1/hotlines` (offline-cached) | `app/hotlines` | M6 | ❌ |
| 21 | News feed: category chips, cards; article detail w/ author | `GET /v1/posts?category=`, `GET /v1/posts/:id` | `app/news`, `app/news/[id]` | M2 | ❌ |
| 22 | Tourism grid + detail (hours, rating, map, directions, favorite ♥) | `GET /v1/places?kind=tourism`, `PUT/DELETE /v1/places/:id/favorite` | `app/tourism`, `app/tourism/[id]` | M7 | ❌ |
| 23 | Directory: search, category, open/closed, rating, call | `GET /v1/places?kind=business` (open-now computed) | `app/directory` | M7 | ❌ |
| 24 | Transport: route finder From→To, popular routes + fares | `GET /v1/transport/routes`, `GET /v1/transport/match?from=&to=` | `app/transport` | M7 | ❌ |
| 25 | Notifications screen (read/unread) | `GET /v1/notifications`, `POST /v1/notifications/:id/read` | `app/notifications` | M2 | ❌ |
| 26 | More: profile, Digital City ID (QR, validity, verify) | `GET /v1/profile`, `GET /v1/digital-id`, public `GET /v1/verify/:token` | `app/(tabs)/more`, `app/digital-id` | M1/M7 | ❌ |
| 27 | More: language toggle EN/FIL | `GET /v1/config` (`locales`), `PATCH /v1/profile` (prefs) | more screen | M8 | ❌ |
| 28 | More: settings, Help & FAQ, Send Feedback, log out | `GET /v1/faq`, `POST /v1/feedback`, `POST /v1/auth/logout` | more screen | M8 | ❌ |
| 29 | Style-guide screen | design artifact — no backend | — (not in app scope) | — | n/a |
| 30 | Toasts ("Calling…", "coming soon") | client-side UX — no backend | shared toast component | M2 | ❌ |

## Cross-cutting re-verification proofs (recorded per milestone)

| Proof | Evidence | Status |
|---|---|---|
| No per-tenant code branches (grep diff for tenant names/prefixes in code) | — | ❌ |
| Module off for one tenant = hidden+inert; on for the other = live (same code) | — | ❌ |
| IDs, theme, onboarding, Mayor's Corner all originate from config | — | ❌ |
| OTP→JWT works; refresh rotates; offline/429 does NOT log out; force-update fails open | — | ❌ |
| Status machines render timelines from audited transitions | — | ❌ |
| `docker compose up` brings backend up clean | — | ❌ |
| App boots BOTH tenants purely from config | — | ❌ |
