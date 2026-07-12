# Mobile visual fixes — design

Date: 2026-07-13
Scope: `mobile-application/` + one data-fix script in `backend/scripts/`.
Constraint: every fix is tenant-agnostic — no per-tenant branches; branding stays config data.

## Problems (observed on Samsung SM-A546E, dark mode, MyDasma tenant)

1. Seal/logo renders with an opaque white rounded-square behind it (onboarding glass
   circle, login hero, home header badge).
2. Onboarding background photo stops ~300px above the bottom; flat slide-color band
   shows between photo and bottom sheet.
3. Hard color seams inside every gradient surface: login hero (horizontal band),
   Emergency SOS bar, Mayor's Corner, home header. Square shadow halos around glowing
   cards on Android.
4. Seal is reused as decorative watermark in home header, Mayor's Corner and
   Digital-ID banner; with an opaque-background seal this shows as a discolored square
   patch.
5. Dark mode: disabled module tile ("Health · Soon") is a 45%-opacity chip over a dark
   background — icon nearly invisible.
6. Android system navigation bar (back/home/recents) always visible; user wants it
   hidden with swipe-up-to-reveal.

## Root causes

1. White box is baked into the uploaded seal PNG — an asset problem, not app code.
2. `app/(auth)/onboarding.tsx` sizes the slide photo to `windowHeight - 300`.
3. `components/ui/gradient-box.tsx` renders `<Svg width="100%" height="100%">` inside
   an `absoluteFill`; percentage sizing is unreliable on Android (Fabric) so the
   gradient rect covers only part of the container, exposing the solid base color with
   a hard seam. Separately, glow shadow styles (`sosGlow`, `primaryGlow`) sit on
   wrapper `Pressable`s that have no `borderRadius`, so Android elevation draws a
   rectangular shadow outline behind rounded children.
4. App code hardcodes `brand.logo.assets.seal` for watermarks even though the config
   contract and tenant admin panel already support `brand.logo.assets.watermark`.
5. `components/home/module-grid.tsx` uses light-only pastel `TONE_COLORS` and dims
   disabled tiles with `opacity: 0.45`.
6. Nothing configures Android navigation-bar visibility.

## Fixes

### F1 — GradientBox reliable fill (fixes every gradient seam at once)

In `components/ui/gradient-box.tsx`: measure the container with `onLayout`; render the
`<Svg>` only once measured, with numeric pixel `width`/`height` (no percentages).
Until measured the existing opaque base color shows (no flash). Keep react-native-svg
(STACK_BASIS §4 — no expo-linear-gradient native dep). No call-site changes.

Shadow halos: give each glow-bearing wrapper the same `borderRadius` as its rounded
child (SOS bar r18, Digital-ID banner r22, onboarding Next pill r14, primary buttons)
so the Android elevation outline is rounded. Touch only the wrappers that carry
`sosGlow`/`primaryGlow`.

### F2 — Onboarding full-bleed

Restructure `app/(auth)/onboarding.tsx`: each slide (photo + duotone overlay) fills
the full screen height; the bottom sheet floats above the photo (absolute bottom).
Remove the `height - 300` math. Glass circle stays vertically centered in the visible
photo area (above the sheet). Skip button, dots, Next pill unchanged.

### F3 — Seal asset cleanup + derived watermark (data fix, script)

New `backend/scripts/fix-brand-seal.ts` (run with `-P tsconfig.scripts.json`), for
every tenant with an http(s) seal:

1. Download current seal.
2. sharp: flood-fill near-white background from the corners → transparency; trim.
3. Re-upload via the existing admin brand-asset flow (presigned PUT + confirm).
4. PATCH branding: `logo.assets.seal` = new URL.
5. Derive watermark: white silhouette from the cleaned seal's alpha channel → upload →
   PATCH `logo.assets.watermark`.

Idempotent (skips seals that already have transparent corners). Best-effort limit:
flood-fill can only strip background *around* the artwork. If the seal is drawn on an
opaque tile (e.g. white rounded square with a colored border), the tile survives —
the script detects this (post-strip alpha coverage still ≳70% of the bounding box),
reports it, and skips the watermark derivation for that tenant (F4 then hides the
watermark). The definitive fix in that case is uploading real transparent artwork via
the tenant panel. Admins can replace either asset later in the panel. No app-code
knowledge of any of this.

### F4 — Watermark slot in app

Home header, Mayor's Corner, Digital-ID banner: render
`brand.logo.assets.watermark` (not seal). When the watermark is not a renderable
http(s) URL, render nothing — no fallback to seal, no placeholder. Small logo badge in
the home header keeps using the seal (it is the logo, not a watermark).

### F5 — Dark-mode module tiles

`constants/modules.ts`: each tone gets a dark sibling — deep muted chip background +
brighter icon (`bgDark`, `iconDark`); `brand` tone derives its dark chip from the
tenant primary at runtime (alpha/darken helper in `lib/theme.ts`), keeping the
single-palette rule (every token has a `-dark` sibling; no per-tenant code).
`module-grid.tsx` picks light/dark via the app's color-scheme hook.

Disabled tile: replace `opacity: 0.45` with explicit muted treatment — line-colored
chip bg, `fg-2` icon color, readable "Soon" badge — with dark siblings.

### F7 — Auth-flow route guard

Tokens/session/refresh are already stored (`services/secure-storage`, auth context) —
the gap is routing: a signed-in user can still navigate to `/(auth)/login`. Fix: new
`app/(auth)/_layout.tsx` guard — when `useAuth().status === "resident"`, `<Redirect>`
to `/(tabs)`; anonymous and guest users pass (guests must reach login to upgrade to
resident). Covers the whole group (onboarding, login, otp). Sign-out stays exclusively
in the More tab (already implemented); the dead-session redirect
(`authEvents` → login) still works because status becomes `anonymous` first.

### F8 — Uniform service-screen headers

`components/ui/screen-header.tsx` (used by every service/sub-screen: transport,
tourism, hotlines, directory, report, assistance, e-services, applications, news
article, digital-id, feedback, faq, notifications, search) is restyled in place into
the branded hero header pattern the Gov Services tab already uses: primary gradient
(GradientBox, tenant colors from config), safe-area top padding, glass back button,
white title, bottom radius. One component change → all call sites uniform with zero
per-screen edits; dynamic titles and `right` accessories keep working. SOS screens
don't use ScreenHeader and keep their red identity. Colors come from tenant config at
runtime — no per-tenant code.

### F6 — Hide Android system navigation bar

Root layout (`app/_layout.tsx`), Android only: `expo-navigation-bar` — visibility
`hidden`, swipe-to-reveal transient behavior (immersive sticky). Exact SDK 54 API
confirmed against https://docs.expo.dev/versions/v54.0.0/ before coding (edge-to-edge
is default in SDK 54 and changes this module's surface). iOS untouched; status bar
stays; in-app tab bar unaffected.

## Out of scope

- No config-contract (Zod) changes — `watermark` already exists.
- No admin-panel changes — upload field already exists.
- No new native dependencies beyond `expo-navigation-bar` (Expo-bundled).

## Verification

1. `cd mobile-application && npx tsc --noEmit && npm run lint`.
2. Backend up → run `fix-brand-seal.ts` → confirm new seal/watermark URLs serve 200.
3. On device (adb, SM-A546E): onboarding full-bleed photo, no white box in glass
   circle, no seams on login/home, watermark (white silhouette) instead of square
   patch, dark-mode tiles readable incl. "Soon" tile, system nav bar hidden and
   swipe-up reveals it.
4. Re-tenant (`EXPO_PUBLIC_TENANT_BUNDLE_ID=com.sorsogon.app`) → same behavior, no
   per-tenant branching (repo grep for tenant strings hits only data).
5. `npx expo export --platform web` still builds.
