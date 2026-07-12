# Mobile Visual Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 visual/UX issues in the white-label mobile app (spec: `docs/superpowers/specs/2026-07-13-mobile-visual-fixes-design.md`): gradient seams, onboarding full-bleed, seal/watermark assets, dark-mode tiles, auth-flow guard, uniform service headers, hidden Android nav bar.

**Architecture:** All app fixes are tenant-agnostic component/layout changes in `mobile-application/`; branding stays config data. One backend ops script cleans the uploaded seal and derives a watermark through the existing admin asset pipeline.

**Tech Stack:** Expo SDK 54 / RN 0.81, expo-router v6, NativeWind v4, react-native-svg, jest-expo + @testing-library/react-native; backend script: ts-node + axios + sharp.

## Global Constraints

- **No per-tenant branches in code** — a repo grep for tenant strings must hit only seed data, `tenant-variants.json`, test inputs.
- **No expo-linear-gradient** (STACK_BASIS §4) — gradients stay react-native-svg.
- Layering rule: UI → hooks → services → api. No new backend calls here.
- Every neutral color token used must have a `-dark` sibling.
- Backend scripts run with `npx ts-node -P tsconfig.scripts.json`.
- **No git commits** until user asks (repo rule overrides plan-template commit steps).
- New native module (`expo-navigation-bar`) requires a dev-client rebuild: `npx expo run:android` with the device attached.

---

### Task 1: GradientBox measured sizing (kills all seams)

**Files:**
- Modify: `mobile-application/components/ui/gradient-box.tsx`
- Test: `mobile-application/__tests__/gradient-box.test.tsx`

**Interfaces:**
- Produces: same `GradientBox` public props (no call-site changes). Svg renders only after `onLayout` with numeric px dims.

- [ ] **Step 1: Write failing test**

```tsx
import { render } from "@testing-library/react-native";
import { GradientBox } from "@/components/ui/gradient-box";

const layout = (w: number, h: number) => ({
  nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } },
});

describe("GradientBox", () => {
  it("renders no svg before layout, numeric-sized svg after", () => {
    const { UNSAFE_queryByType, UNSAFE_getByType, getByTestId } = render(
      <GradientBox
        testID="box"
        stops={[
          { color: "#111111", offset: 0 },
          { color: "#222222", offset: 1 },
        ]}
      />,
    );
    const Svg = require("react-native-svg").Svg;
    expect(UNSAFE_queryByType(Svg)).toBeNull(); // not yet measured
    getByTestId("box").props.onLayout(layout(320, 180));
    const svg = UNSAFE_getByType(Svg);
    expect(svg.props.width).toBe(320);
    expect(svg.props.height).toBe(180);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (`npx jest __tests__/gradient-box.test.tsx`) — Svg is rendered immediately with `"100%"`.

- [ ] **Step 3: Implement**

```tsx
// gradient-box.tsx — replace component body
import { useState } from "react";
// GradientBoxProps gains: testID?: string  (pass through to the container View)

export function GradientBox({ stops, start = { x: 0, y: 0 }, end = { x: 1, y: 1 }, style, className, children, testID }: GradientBoxProps) {
  const id = `grad-${(gradientCounter = (gradientCounter + 1) % 1e6)}`;
  const baseColor = stops.length ? stops[Math.floor((stops.length - 1) / 2)].color : undefined;
  // Android (Fabric) does not reliably resolve percentage Svg sizes inside an
  // absoluteFill — measure and use numeric pixels; base color shows until then.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      testID={testID}
      className={className}
      style={[{ overflow: "hidden", backgroundColor: baseColor }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
      }}
    >
      {size && size.w > 0 && size.h > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Defs>
            <SvgLinearGradient id={id} x1={String(start.x)} y1={String(start.y)} x2={String(end.x)} y2={String(end.y)}>
              {stops.map((stop) => (
                <Stop key={`${stop.offset}-${stop.color}`} offset={String(stop.offset)} stopColor={stop.color} />
              ))}
            </SvgLinearGradient>
          </Defs>
          <Rect width={size.w} height={size.h} fill={`url(#${id})`} />
        </Svg>
      )}
      {children}
    </View>
  );
}
```

(`preserveAspectRatio` no longer needed with numeric dims.)

- [ ] **Step 4: Run test — expect PASS.**
- [ ] **Step 5: Rounded shadow outlines.** Every wrapper carrying `sosGlow`/`primaryGlow` gets a matching `borderRadius` so the Android elevation outline is rounded, not square. Call sites (verify with `grep -n "sosGlow\|primaryGlow" app components`):
  - `app/(tabs)/index.tsx` SOS `Pressable`: `style={[sosGlow, { borderRadius: 18 }]}`
  - `app/(tabs)/index.tsx` Digital-ID `Pressable`: `style={[primaryGlow(primary), { borderRadius: 22 }]}`
  - `app/(auth)/onboarding.tsx` Next pill: already same-view rounded — no change.
  - `components/ui/primary-button.tsx` + any other hits: same treatment (radius = child's).
- [ ] **Step 6: `npx tsc --noEmit` clean.**

### Task 2: Onboarding full-bleed

**Files:**
- Modify: `mobile-application/app/(auth)/onboarding.tsx`

**Interfaces:** none new (screen-internal).

- [ ] **Step 1: Restructure render** — photo fills screen; sheet floats:

```tsx
// Replace slideHeight math and layout:
const [sheetH, setSheetH] = useState(300); // measured; 300 = pre-measure estimate

return (
  <View className="flex-1" style={{ backgroundColor: activeSlide?.bg }}>
    <FlatList
      style={StyleSheet.absoluteFill}
      ref={listRef}
      data={slides}
      /* keyExtractor / paging / viewability / getItemLayout unchanged */
      renderItem={({ item }) => (
        <View style={{ width, height, backgroundColor: item.bg }}>
          <AssetImage
            uri={item.image}
            style={{ position: "absolute", width, height, opacity: 0.35 }}
            resizeMode="cover"
            accessibilityLabel={item.title}
          />
          {/* Glass circle centered in the area above the sheet */}
          <View className="flex-1 items-center justify-center" style={{ paddingBottom: sheetH }}>
            {/* glass circle + AssetImage(seal) unchanged */}
          </View>
        </View>
      )}
    />
    {/* Skip unchanged */}
    {/* Bottom sheet: absolute, measured */}
    <View
      onLayout={(e) => setSheetH(Math.round(e.nativeEvent.layout.height))}
      className="absolute inset-x-0 bottom-0 bg-surface px-6 pt-7 dark:bg-surface-dark"
      style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 20 }}
    >
      {/* title/body/dots/next unchanged */}
    </View>
  </View>
);
```

`height` from `useWindowDimensions` (full). Remove `slideHeight`.

- [ ] **Step 2: `npx tsc --noEmit` + `npx jest` (existing suites stay green).**
- [ ] **Step 3: Device check** (deferred to Task 9): photo edge-to-edge behind sheet, no flat band.

### Task 3: Uniform branded service headers (F8)

**Files:**
- Modify: `mobile-application/components/ui/screen-header.tsx`

**Interfaces:**
- Produces: same `ScreenHeader({ title, right })` API — zero call-site changes. All 20+ sub-screens (transport, tourism, hotlines, directory, report, assistance, e-services, applications, news article, digital-id, feedback, faq, notifications, search) get the branded hero automatically. SOS untouched (doesn't use ScreenHeader).

- [ ] **Step 1: Restyle in place**

```tsx
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientBox } from "@/components/ui/gradient-box";
import { AppText } from "@/components/ui/typography";
import { palette } from "@/constants/colors";
import { useTenantConfig } from "@/contexts/tenant-config-context";
import { lightenHex } from "@/lib/theme";

/**
 * Sub-screen hero header: tenant primary gradient (config-driven), glass back
 * button, white title. Pulls itself up over the parent Screen's safe-area
 * padding so the gradient reaches the status bar.
 */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useTenantConfig();
  const primary = config?.brand.colors.primary ?? palette.brand;
  const primaryDark = config?.brand.colors.primaryDark ?? palette["brand-dark"];
  return (
    <GradientBox
      stops={[
        { color: primaryDark, offset: 0 },
        { color: primary, offset: 0.65 },
        { color: lightenHex(primary, 0.15), offset: 1 },
      ]}
      style={{
        marginTop: -insets.top, // Screen already padded the inset; reclaim it
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 12,
      }}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-[14px] active:opacity-60"
          style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
        <AppText variant="section" className="flex-1 text-white" numberOfLines={1}>
          {title}
        </AppText>
        {right}
      </View>
    </GradientBox>
  );
}
```

- [ ] **Step 2: Audit `right` accessories** — `grep -n "right=" app` — any icon colored for light surface gets white/glass treatment at its call site.
- [ ] **Step 3: Audit non-`Screen` parents** — every ScreenHeader call site must sit inside `<Screen padTop>` (default) for the negative margin to be correct; fix outliers by wrapping or dropping the negative margin via a `flush` boolean prop only if an outlier exists.
- [ ] **Step 4: `npx tsc --noEmit` + lint.**

### Task 4: Watermark slot (F4)

**Files:**
- Modify: `mobile-application/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `config.brand.logo.assets.watermark`, `isRenderableAssetUrl` from `@/lib/asset-url`.

- [ ] **Step 1: Replace all three watermark blocks** (header ~L98, Mayor's Corner ~L240, Digital-ID ~L368): `const watermark = brand.logo.assets.watermark;` and render each block as

```tsx
{isRenderableAssetUrl(watermark) && (
  <View pointerEvents="none" style={{ position: "absolute", right: -20, top: -10, opacity: 0.14 }}>
    <AssetImage uri={watermark} style={{ width: 150, height: 150 }} resizeMode="contain" />
  </View>
)}
```

(same treatment for the other two blocks with their existing offsets/sizes/opacities). No fallback to seal. The 40px logo badge keeps using `seal`.

- [ ] **Step 2: `npx tsc --noEmit`; existing jest green.**

### Task 5: Dark-mode module tiles (F5)

**Files:**
- Modify: `mobile-application/constants/modules.ts`, `mobile-application/lib/modules.ts`, `mobile-application/components/home/module-grid.tsx`
- Test: `mobile-application/__tests__/module-tones.test.ts`

**Interfaces:**
- Produces: `resolveToneColors(tone: ModuleTone, scheme: "light" | "dark", primary: string, tint: string): { bg: string; icon: string }` in `lib/modules.ts`; `TONE_COLORS[tone] = { light: ToneChip; dark: ToneChip }`; `DISABLED_TILE: { light: ToneChip; dark: ToneChip }`.

- [ ] **Step 1: Failing test**

```ts
import { resolveToneColors, DISABLED_TILE } from "@/lib/modules";

describe("resolveToneColors", () => {
  it("returns dark siblings in dark scheme", () => {
    const light = resolveToneColors("red", "light", "#1B5E20", "#EDF1ED");
    const dark = resolveToneColors("red", "dark", "#1B5E20", "#EDF1ED");
    expect(light).toEqual({ bg: "#FDEDEC", icon: "#E53935" });
    expect(dark).toEqual({ bg: "#3B1D1E", icon: "#FF8A80" });
  });
  it("derives brand tone from tenant primary at runtime (no per-tenant code)", () => {
    expect(resolveToneColors("brand", "light", "#1B5E20", "#EDF1ED")).toEqual({ bg: "#EDF1ED", icon: "#1B5E20" });
    const dark = resolveToneColors("brand", "dark", "#1B5E20", "#EDF1ED");
    expect(dark.bg).toBe("#1B5E2033"); // 20% alpha primary
    expect(dark.icon).not.toBe("#1B5E20"); // lightened for contrast
  });
  it("disabled tile chips are readable in both schemes", () => {
    expect(DISABLED_TILE.light.bg).toBeTruthy();
    expect(DISABLED_TILE.dark.bg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — FAIL (no export).**
- [ ] **Step 3: Implement**

`constants/modules.ts`:

```ts
export interface ToneChip { bg: string; icon: string }
export const TONE_COLORS: Record<Exclude<ModuleTone, "brand">, { light: ToneChip; dark: ToneChip }> = {
  red:    { light: { bg: "#FDEDEC", icon: "#E53935" }, dark: { bg: "#3B1D1E", icon: "#FF8A80" } },
  gold:   { light: { bg: "#FEF3D9", icon: "#D4A017" }, dark: { bg: "#3A2F17", icon: "#FFD54F" } },
  blue:   { light: { bg: "#E8F1FA", icon: "#2274A5" }, dark: { bg: "#16293B", icon: "#82B6DD" } },
  purple: { light: { bg: "#F1ECFA", icon: "#7E57C2" }, dark: { bg: "#2A2140", icon: "#B39DDB" } },
};
```

`lib/modules.ts` additions:

```ts
import { palette } from "@/constants/colors";
import { TONE_COLORS, type ModuleTone, type ToneChip } from "@/constants/modules";
import { lightenHex } from "@/lib/theme";

export const DISABLED_TILE: { light: ToneChip; dark: ToneChip } = {
  light: { bg: palette.line, icon: palette["fg-2"] },
  dark: { bg: palette["line-dark"], icon: palette["fg-2-dark"] },
};

export function resolveToneColors(
  tone: ModuleTone,
  scheme: "light" | "dark",
  primary: string,
  tint: string,
): ToneChip {
  if (tone === "brand") {
    return scheme === "dark"
      ? { bg: `${primary}33`, icon: lightenHex(primary, 0.45) }
      : { bg: tint, icon: primary };
  }
  return TONE_COLORS[tone][scheme];
}
```

`module-grid.tsx`: delete local `toneColors`; `const { scheme } = useThemeMode();` (from `@/contexts/theme-context`); tiles use `resolveToneColors(tile.tone, scheme, primary, tint)`; disabled tiles use `DISABLED_TILE[scheme]` for chip bg + icon color and **drop `opacity: 0.45`**; "Soon" badge → `bg-line dark:bg-line-dark` with `text-fg-2 dark:text-fg-2-dark`; platform tiles (Hotlines/Digital ID) go through the same resolver (`blue` / `brand`).

- [ ] **Step 4: Run tests — PASS. `npx tsc --noEmit`.**

### Task 6: Auth-flow guard (F7)

**Files:**
- Create: `mobile-application/app/(auth)/_layout.tsx`
- Test: `mobile-application/__tests__/auth-guard.test.tsx`

**Interfaces:**
- Consumes: `useAuth().status` (`"anonymous" | "guest" | "resident"`).

- [ ] **Step 1: Failing test**

```tsx
import { render } from "@testing-library/react-native";

const mockUseAuth = jest.fn();
jest.mock("@/contexts/auth-context", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("expo-router", () => ({
  Redirect: jest.fn(() => null),
  Stack: jest.fn(() => null),
}));

import { Redirect, Stack } from "expo-router";
import AuthLayout from "@/app/(auth)/_layout";

describe("auth group guard", () => {
  beforeEach(() => jest.clearAllMocks());
  it.each(["anonymous", "guest"] as const)("lets %s through", (status) => {
    mockUseAuth.mockReturnValue({ status });
    render(<AuthLayout />);
    expect(Stack).toHaveBeenCalled();
    expect(Redirect).not.toHaveBeenCalled();
  });
  it("redirects residents to tabs", () => {
    mockUseAuth.mockReturnValue({ status: "resident" });
    render(<AuthLayout />);
    expect(Redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(tabs)" }),
      undefined,
    );
  });
});
```

- [ ] **Step 2: Run — FAIL (module missing).**
- [ ] **Step 3: Implement**

```tsx
import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/contexts/auth-context";

/**
 * Auth-group guard: a signed-in RESIDENT can never re-enter onboarding /
 * login / otp — sign-out only via the More tab. Guests pass (login is their
 * upgrade path); anonymous users pass (it's the auth flow).
 */
export default function AuthLayout() {
  const { status } = useAuth();
  if (status === "resident") return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Run — PASS. Full jest suite green.**

### Task 7: Hide Android system navigation bar (F6)

**Files:**
- Modify: `mobile-application/package.json` (expo install), `mobile-application/app.config.ts`, `mobile-application/app/_layout.tsx`

**Interfaces:** none consumed by other tasks.

- [ ] **Step 1:** `npx expo install expo-navigation-bar`
- [ ] **Step 2:** `app.config.ts` plugins: add `["expo-navigation-bar", { "visibility": "hidden", "behavior": "overlay-swipe" }]` (behavior applies at prebuild; runtime `setBehaviorAsync` is a no-op under `edgeToEdgeEnabled: true`).
- [ ] **Step 3:** `ThemedRoot` in `app/_layout.tsx` — re-hide on foreground (system re-shows the bar after some interactions):

```tsx
import * as NavigationBar from "expo-navigation-bar";
import { AppState, Platform } from "react-native";

useEffect(() => {
  if (Platform.OS !== "android") return;
  void NavigationBar.setVisibilityAsync("hidden");
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") void NavigationBar.setVisibilityAsync("hidden");
  });
  return () => sub.remove();
}, []);
```

- [ ] **Step 4:** Rebuild dev client: `npx expo run:android` (native module added). `npx tsc --noEmit`.

### Task 8: Seal cleanup + watermark derivation script (F3)

**Files:**
- Create: `backend/scripts/fix-brand-seal.ts`

**Interfaces:**
- Consumes: gateway admin API (`/admin/auth/login`, `/admin/assets/presign|confirm`, `/admin/tenants/:id/config/branding`) — same flow as `scripts/seed-brand-assets.ts`.

- [ ] **Step 1: Implement script** (structure mirrors seed-brand-assets.ts: BASE/ADMIN_* envs, `upload()`, `patchBranding()`, BUNDLES loop):

```ts
/**
 * One-shot asset fix: strips the near-white background around each tenant's
 * uploaded seal (corner flood fill) and derives a white-silhouette watermark
 * from the cleaned alpha. Uploads through the admin brand-asset pipeline and
 * patches config. Idempotent: seals whose corners are already transparent are
 * skipped. If the artwork itself is an opaque tile (post-strip opaque
 * coverage ≥ 70% of the bounding box), the tile is reported and the
 * watermark step is skipped for that tenant (app hides missing watermarks).
 * Run: npx ts-node -P tsconfig.scripts.json scripts/fix-brand-seal.ts
 */
import "dotenv/config";
import axios from "axios";
import sharp from "sharp";

// login/upload/patchBranding identical to seed-brand-assets.ts

const NEAR_WHITE = 240; // r,g,b all ≥ → background candidate

async function stripBackground(input: Buffer): Promise<{ cleaned: Buffer; opaqueCoverage: number; alreadyTransparent: boolean }> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = (x: number, y: number) => (y * width + x) * 4;
  const isBg = (i: number) => data[i + 3] > 0 && data[i] >= NEAR_WHITE && data[i + 1] >= NEAR_WHITE && data[i + 2] >= NEAR_WHITE;
  const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)];
  const alreadyTransparent = corners.every((i) => data[i + 3] === 0);
  if (!alreadyTransparent) {
    // BFS flood fill from all four corners through near-white pixels → alpha 0
    const stack: Array<[number, number]> = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    const seen = new Uint8Array(width * height);
    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const idx = y * width + x;
      if (seen[idx]) continue;
      seen[idx] = 1;
      const i = px(x, y);
      if (!isBg(i)) continue;
      data[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 16) opaque++;
  return {
    cleaned: await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    opaqueCoverage: opaque / (width * height),
    alreadyTransparent,
  };
}

async function whiteSilhouette(cleanedPng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(cleanedPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// main(): for each bundle → GET /config (X-Tenant-ID) → seal URL; skip when not http(s).
// download (arraybuffer) → stripBackground →
//   if alreadyTransparent: log "skip (already transparent)"; continue
//   upload cleaned → patchBranding({ logo: { assets: { seal: url } } })
//   if opaqueCoverage >= 0.7: log tile-artwork warning, skip watermark
//   else: whiteSilhouette → upload → patchBranding({ logo: { assets: { watermark: url } } })
```

(main-loop plumbing is a copy of seed-brand-assets.ts lines 54–126 with the new steps; write it out fully in the file.)

- [ ] **Step 2:** Backend stack up (`docker compose -f docker-compose.yml -f docker-compose.services.yml up -d`) → run script → expect per-tenant log lines with new URLs or skip/tile warnings.
- [ ] **Step 3:** `curl` both new URLs → 200; `curl /v1/config` shows new `seal`/`watermark`.

### Task 9: Verification & adjustments (device, both tenants)

- [ ] `cd mobile-application && npx tsc --noEmit && npm run lint && npx jest` — all green.
- [ ] `npx expo export --platform web` — builds.
- [ ] Backend up; `npx expo run:android` (dev client with expo-navigation-bar) on SM-A546E via adb; `adb reverse tcp:3005 tcp:3005` so device reaches gateway.
- [ ] MyDasma pass, light + dark (toggle in More): onboarding photo full-bleed to bottom; seal clean in glass circles (no white tile — or tile reported by script as artwork); login hero seamless gradient; SOS bar/Mayor's Corner seamless, no square shadow halos; watermark silhouette or hidden (never seal tile); dark tiles readable incl. "Soon"; service screens all show branded hero header; SOS screen unchanged; login → resident → deep-link/back to login redirects to tabs; sign-out via More works; system nav bar hidden, swipe-up reveals transiently.
- [ ] Re-tenant: `EXPO_PUBLIC_TENANT_BUNDLE_ID=com.sorsogon.app npx expo start` — same checks pass; grep repo for "dasmarinas" → only data/tests.
- [ ] Adjust anything found; re-run affected checks.
