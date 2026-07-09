# Mobile Functional-Fix Pass — Design

**Date:** 2026-07-06
**Scope:** `mobile-application/` (Expo SDK 54), with backend endpoint additions only if the screen audit finds a feature with no server support.
**Goal:** Fix what is actually broken or visibly off in the app — a system-theme conflict, bare "missing asset" fallbacks, and any per-screen behavior/wiring defects — without a pixel-perfect redesign.

## Context

The app is a white-label civic super-app that boots entirely from `/v1/config`. It is already broadly functional: auth (OTP→JWT), config-driven branded home, e-Gov catalog + application + payment, reports, assistance, SOS (incl. HTTP fallback), places, transport, search, notifications, digital ID, FAQ/feedback all have both gateway routes and mobile service modules. So this is a fix-and-polish pass, not a build-out.

Three problems drive the work:

1. **Theme conflicts with the system theme.** Picking a theme in-app does not fully take effect; some surfaces still follow the OS.
2. **Missing assets render as bare/empty boxes.** Seeded data carries no image URLs, so every asset falls back — and some fallbacks are blank.
3. **Possible per-screen behavior defects** surfaced only by driving each screen on a device.

## Workstream A — Unified theme mode (system / light / dark)

### Root cause

Two sources of truth for the color scheme, and they desync:

- [`hooks/use-theme.ts`](../../../mobile-application/hooks/use-theme.ts) sets **NativeWind's** `colorScheme` (`nativewind` package). This drives `dark:` utility variants.
- [`app/_layout.tsx`](../../../mobile-application/app/_layout.tsx) reads **React Native's** `useColorScheme()` (`react-native`) to compute the navigation theme background, the `Stack` `contentStyle` background, and the `StatusBar` style. RN's hook follows the **OS**, ignoring the in-app override.

Result: choosing "Light" on a dark device gives light components on a dark navigation/screen frame (and vice versa) — the visible conflict. Second defect: the preference is only read/applied inside `use-theme`, which is mounted only by the More tab, so it is **not restored at app startup**.

### Design

- **New `contexts/theme-context.tsx` (`ThemeModeProvider`)**, the single owner of theme state:
  - On mount, read the persisted preference (`AsyncStorage` key `theme-preference`, values `system` | `light` | `dark`) and apply it to NativeWind via `colorScheme.set(...)` **before first paint**. Block initial render until the preference is loaded (a startup gate mirroring the existing `fontsLoaded` gate) so there is no flash of the wrong theme.
  - Expose `{ preference, setPreference, scheme }` where `scheme` is the **effective** `"light" | "dark"` from NativeWind's `useColorScheme()` (which resolves `system` against the device and honors a forced override).
  - `setPreference` updates state, applies to NativeWind, and persists to `AsyncStorage`.
- **Refactor `app/_layout.tsx`** to read the effective `scheme` from `ThemeModeProvider` (NOT RN's `useColorScheme`) for `navTheme.colors.background`/`card`, `Stack.screenOptions.contentStyle.backgroundColor`, and `<StatusBar style=…>`. Now every surface — utility classes, navigation frame, status bar, screen background — follows one source.
- **Provider placement:** `ThemeModeProvider` wraps the tree so both `NavigationThemeProvider` and the brand-var `ThemeProvider` can read the effective scheme. It sits high in the provider stack; `_layout` consumes it via a hook.
- **Preference naming:** rename `"auto"` → `"system"` for clarity (the string persisted/compared), keeping three modes only. Update the More toggle and the i18n strings accordingly.
- **More-tab control:** replace the single cycle button with a **System / Light / Dark segmented control** (three inline segments, active segment brand-tinted, icons: monitor / sun / moon). Lives in the same place in [`app/(tabs)/more.tsx`](../../../mobile-application/app/(tabs)/more.tsx).
- **Retire `hooks/use-theme.ts`** (logic absorbed into the provider) or reduce it to a thin re-export of the context hook to avoid breaking imports.

### Rejected alternatives

- `Appearance.setColorScheme()` (RN-global): process-wide, unreliable across the tree, discouraged by RN docs.
- A hand-rolled context that stores `"light"|"dark"` and passes it down for manual styling: reinvents NativeWind's variant mechanism the app already uses everywhere.

## Workstream B — Branded asset placeholders

### Root cause

Seeds carry no image URLs (`brand.logo.assets.seal`, `brand.executive.photo`, post `hero_image`, place images are all absent), so [`components/ui/asset-image.tsx`](../../../mobile-application/components/ui/asset-image.tsx) always renders its `fallback`. Some fallbacks are good (initials for logo badge, mayor photo); the hero fallback in [`components/home/announcements-carousel.tsx`](../../../mobile-application/components/home/announcements-carousel.tsx) is a blank mint box, and several `AssetImage` spots pass no fallback at all (render nothing).

### Design

- **New `components/ui/image-placeholder.tsx`**: a self-contained branded placeholder — brand-tinted background (`bg-tint`, dark-mode aware) with a centered `lucide` icon, filling its container and honoring the parent's rounding. Prop: `icon` (default a generic image glyph; callers pass `newspaper` / `store` / `map-pin` / `image` as appropriate) and optional `size`.
- **`AssetImage` change**: when no explicit `fallback` is provided, default to `<ImagePlaceholder icon={placeholderIcon} />`. Add an optional `placeholderIcon` prop. Existing explicit fallbacks (initials) are preserved.
- **Apply proper fallbacks** at every image spot that can be missing:
  - Announcements hero + News feed cards + News article hero → `newspaper` placeholder.
  - Tourism grid/detail, Directory, Places/nearby thumbnails → `map-pin` / `store` placeholder.
  - Avatars (mayor, user, logo badge) keep their initials fallbacks.
- **Seal watermark spots** (home header, Mayor's Corner, Digital-ID banner) currently render nothing when absent — acceptable; leave unless the placeholder drops in trivially.

### Rejected alternative

Per-spot inline fallbacks (status quo): inconsistent and scattered. One shared component + an `AssetImage` default centralizes the look.

## Workstream C — Per-screen audit + wiring/behavior fixes

### Method (functional-fix, no pixel-chasing)

Drive each screen on the connected Android device (Expo Go over LAN) against the containerized backend. For each screen confirm: (1) real data loads with no error; (2) primary actions complete end-to-end; (3) empty / loading / error states render sensibly; (4) no theme or asset breakage in **both** light and dark. Compare to the tenant design PNG in `docs/designs/extracted/screens/<tenant>/` only for **gross** misalignment. Fix what is found. Add a backend endpoint **only** if a screen's feature has no server support — using the existing patterns (zod/DTO validation, TCP RPC via `callService`, tenant scoping, `{PREFIX}-` ids) plus a `verify-e2e` check. Exploration found wiring already complete, so endpoint additions are expected to be rare-to-none.

### Screen checklist

Onboarding · Login · OTP · Home · Notifications · Search · SOS · Services (catalog / detail / form / review / payment / my-applications) · Report (categories / form / detail / my-reports) · Assistance (list / detail / apply) · Hotlines · News (feed / article) · Tourism (grid / detail) · Directory · Transport · Digital ID · More (profile / language toggle / FAQ / feedback).

### Deliverable per finding

A concrete fix (UI, behavior, or wiring). Each fix is verified on-device before moving on.

## Testing / verification

- **Mobile:** `npx tsc --noEmit`, `npm run lint`, `npm test` (existing suites plus new unit tests for theme resolution/persistence and the asset placeholder/`asset-url` logic). On-device pass per fixed screen with a screenshot, run **once in light and once in dark** to prove the toggle holds across the app.
- **Backend:** only if endpoints are added — extend `backend/scripts/verify-e2e.ts` and keep the 3-tenant run green.
- **Regression invariants:** app still boots all 3 tenants purely from config; no per-tenant code branches introduced; offline/429 never logs out.

## Scope guards (YAGNI)

- No pixel-perfect redesign; only gross-misalignment fixes.
- No new product features beyond fixing broken behavior.
- No backend changes unless a genuinely server-less feature is found.
- Theme is exactly three modes: system / light / dark.

## Rollout

Work on branch `feat/mobile-functional-fix`, committed at phase checkpoints (spec → A → B → C → final verification). No push/PR without explicit request.
