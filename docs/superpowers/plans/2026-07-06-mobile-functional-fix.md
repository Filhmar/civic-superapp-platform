# Mobile Functional-Fix Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the in-app theme so it fully overrides the system theme, replace bare "missing asset" fallbacks with a branded placeholder, and fix per-screen behavior/wiring defects found by driving the app on a device.

**Architecture:** Mobile-only (Expo SDK 54 + NativeWind v4 + expo-router). Make NativeWind's `colorScheme` the single source of truth for light/dark, restored at startup by a new `ThemeModeProvider`, and consumed by `_layout` for the nav frame / status bar / content background. A shared `ImagePlaceholder` becomes `AssetImage`'s default fallback. Backend untouched unless a screen has no server support.

**Tech Stack:** TypeScript, React Native 0.81, expo-router v6, NativeWind v4 (`nativewind`), `@react-native-async-storage/async-storage`, `lucide-react-native`, jest (jest-expo), `@testing-library/react-native`.

## Global Constraints

- Read Expo v54 versioned docs before writing mobile code (`mobile-application/AGENTS.md`).
- Every per-tenant value stays data (config), never code. No `if (tenant === …)` branches.
- Layering: component → hook → service → api client. UI never imports axios.
- Every neutral color token has a `-dark` sibling; brand tokens are runtime CSS vars — never hard-code tenant colors.
- Theme modes are exactly three: `system` | `light` | `dark`. Persist under AsyncStorage key `theme-preference`.
- Verification gate for any change: `npx tsc --noEmit` clean, `npm run lint` clean, `npm test` green.
- Work on branch `feat/mobile-functional-fix`; commit per task.
- Run mobile commands from `mobile-application/`.

---

## Phase A — Unified theme mode

### Task A1: Pure theme-preference helper (TDD)

**Files:**
- Create: `mobile-application/lib/theme-mode.ts`
- Test: `mobile-application/lib/__tests__/theme-mode.test.ts`

**Interfaces:**
- Produces: `type ThemePreference = "system" | "light" | "dark"`; `normalizeThemePreference(value: unknown): ThemePreference` (returns `"system"` for anything invalid).

- [ ] **Step 1: Write the failing test**

```ts
// mobile-application/lib/__tests__/theme-mode.test.ts
import { normalizeThemePreference } from "@/lib/theme-mode";

describe("normalizeThemePreference", () => {
  it("passes through the three valid modes", () => {
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
  });

  it("defaults to system for invalid / legacy / null values", () => {
    expect(normalizeThemePreference("auto")).toBe("system"); // legacy value
    expect(normalizeThemePreference(null)).toBe("system");
    expect(normalizeThemePreference(undefined)).toBe("system");
    expect(normalizeThemePreference("")).toBe("system");
    expect(normalizeThemePreference(42)).toBe("system");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/__tests__/theme-mode.test.ts`
Expected: FAIL — cannot find module `@/lib/theme-mode`.

- [ ] **Step 3: Write minimal implementation**

```ts
// mobile-application/lib/theme-mode.ts
/**
 * Theme preference model. `system` follows the OS; `light`/`dark` force it.
 * Persisted under AsyncStorage key "theme-preference".
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme-preference";

const VALID: readonly ThemePreference[] = ["system", "light", "dark"];

/** Coerce any stored/unknown value to a valid preference (default: system). */
export function normalizeThemePreference(value: unknown): ThemePreference {
  return VALID.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : "system";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/__tests__/theme-mode.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add mobile-application/lib/theme-mode.ts mobile-application/lib/__tests__/theme-mode.test.ts
git commit -m "feat(mobile): theme-preference model + normalizer"
```

### Task A2: ThemeModeProvider (single source of truth + startup restore)

**Files:**
- Create: `mobile-application/contexts/theme-context.tsx`
- Modify: `mobile-application/hooks/use-theme.ts` (reduce to a re-export so existing imports keep working)

**Interfaces:**
- Consumes: `ThemePreference`, `THEME_STORAGE_KEY`, `normalizeThemePreference` from `@/lib/theme-mode`.
- Produces: `<ThemeModeProvider>`; `useThemeMode(): { preference: ThemePreference; setPreference: (p: ThemePreference) => void; scheme: "light" | "dark" }`. `hooks/use-theme.ts` re-exports `useThemeMode as useTheme` and `ThemePreference`.

- [ ] **Step 1: Write the provider**

```tsx
// mobile-application/contexts/theme-context.tsx
/**
 * Owns the app's light/dark mode. NativeWind's colorScheme is the single
 * source of truth (drives `dark:` variants AND, via useThemeMode().scheme,
 * the navigation frame / status bar / content bg in _layout). Restores the
 * persisted preference at startup and blocks first paint until it is applied,
 * so there is no flash of the wrong theme.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  normalizeThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme-mode";

interface ThemeModeValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  scheme: "light" | "dark";
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  // null = still restoring persisted preference (startup gate).
  const [preference, setPreferenceState] = useState<ThemePreference | null>(
    null,
  );

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      const pref = normalizeThemePreference(stored);
      setColorScheme(pref); // 'system' | 'light' | 'dark'
      setPreferenceState(pref);
    });
  }, [setColorScheme]);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setColorScheme(pref);
      setPreferenceState(pref);
      void AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    },
    [setColorScheme],
  );

  if (preference === null) return null; // no flash of wrong theme

  return (
    <ThemeModeContext.Provider
      value={{ preference, setPreference, scheme: colorScheme ?? "light" }}
    >
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) {
    // Defensive default so a stray consumer never crashes (e.g. static render).
    return { preference: "system", setPreference: () => {}, scheme: "light" };
  }
  return ctx;
}
```

- [ ] **Step 2: Reduce the old hook to a compatibility re-export**

```ts
// mobile-application/hooks/use-theme.ts
/** Back-compat shim — real implementation lives in the ThemeModeProvider. */
export { useThemeMode as useTheme } from "@/contexts/theme-context";
export type { ThemePreference } from "@/lib/theme-mode";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). `more.tsx` still imports `{ useTheme, type ThemePreference }` and resolves via the shim.

- [ ] **Step 4: Commit**

```bash
git add mobile-application/contexts/theme-context.tsx mobile-application/hooks/use-theme.ts
git commit -m "feat(mobile): ThemeModeProvider owns colorScheme + startup restore"
```

### Task A3: Wire `_layout` to the effective scheme

**Files:**
- Modify: `mobile-application/app/_layout.tsx`

**Interfaces:**
- Consumes: `ThemeModeProvider`, `useThemeMode` from `@/contexts/theme-context`.

- [ ] **Step 1: Restructure RootLayout to host the provider and consume the scheme**

Replace the body of `app/_layout.tsx` (keep imports; add the two below; remove the `useColorScheme` import from `@/hooks/use-color-scheme`):

```tsx
import { ThemeModeProvider, useThemeMode } from "@/contexts/theme-context";
// remove: import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!fontsLoaded) return null; // bundled font load — local, never network

  return (
    <ThemeModeProvider>
      <ThemedRoot />
    </ThemeModeProvider>
  );
}

function ThemedRoot() {
  const { scheme } = useThemeMode();
  const router = useRouter();
  const isDark = scheme === "dark";
  const bg = isDark ? palette["bg-dark"] : palette.bg;

  useEffect(() => {
    return authEvents.on("unauthenticated", () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      router.replace("/(auth)/login");
    });
  }, [router]);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: bg,
      card: isDark ? palette["surface-dark"] : palette.surface,
    },
  };

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <KeyboardProvider>
        <NavigationThemeProvider value={navTheme}>
          <TenantConfigProvider>
            <ThemeProvider>
              <AuthProvider>
                <LocaleProvider>
                  <ToastProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: bg },
                      }}
                    />
                    <StatusBar style={isDark ? "light" : "dark"} />
                    <ForceUpdateGate />
                  </ToastProvider>
                </LocaleProvider>
              </AuthProvider>
            </ThemeProvider>
          </TenantConfigProvider>
        </NavigationThemeProvider>
      </KeyboardProvider>
    </PersistQueryClientProvider>
  );
}
```

Note: `StatusBar style` was `"auto"`; it now derives from the effective scheme so it follows the toggle, not the OS.

- [ ] **Step 2: Delete the now-unused RN color-scheme shim if nothing else imports it**

Run: `npx grep -rn "use-color-scheme" mobile-application/app mobile-application/components mobile-application/hooks` (or ripgrep). If `hooks/use-color-scheme.ts` / `.web.ts` have no other importers, delete both files. If anything still imports them, leave them.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile-application/app/_layout.tsx
git rm mobile-application/hooks/use-color-scheme.ts mobile-application/hooks/use-color-scheme.web.ts   # only if unused
git commit -m "fix(mobile): nav frame, status bar, content bg follow the theme toggle"
```

### Task A4: More-tab segmented control (System / Light / Dark)

**Files:**
- Modify: `mobile-application/app/(tabs)/more.tsx`
- Modify: `mobile-application/constants/strings.ts`

- [ ] **Step 1: Update strings — rename the Auto label to System**

In `constants/strings.ts`, in BOTH `en` and `fil`, replace the `themeAuto` entry with `themeSystem`:

```ts
// en:
  themeSystem: "System",
// fil:
  themeSystem: "Sistema",
```

(Remove the old `themeAuto` key from both maps.)

- [ ] **Step 2: Replace the cycle button with a segmented control in `more.tsx`**

Remove `cycleTheme`, `themeLabel`, and the single Theme `MenuItem`. Update the theme import and add a `ThemeSegmented` block. Replace the `Moon`/`Sun` import usage with `Monitor, Moon, Sun`:

```tsx
import { Monitor, Moon, Sun } from "lucide-react-native";
import type { ThemePreference } from "@/lib/theme-mode";

// inside More(), replace the Theme MenuItem with:
<View className="rounded-2xl bg-surface p-3 dark:bg-surface-dark">
  <AppText variant="caption" className="mb-2 px-1">
    {t("theme")}
  </AppText>
  <View className="flex-row gap-2">
    {(
      [
        { key: "system", label: t("themeSystem"), Icon: Monitor },
        { key: "light", label: t("themeLight"), Icon: Sun },
        { key: "dark", label: t("themeDark"), Icon: Moon },
      ] as { key: ThemePreference; label: string; Icon: typeof Monitor }[]
    ).map(({ key, label, Icon }) => {
      const active = preference === key;
      return (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          onPress={() => setPreference(key)}
          className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
            active ? "bg-brand" : "bg-tint dark:bg-bg-dark"
          }`}
        >
          <Icon
            size={16}
            color={active ? "#FFFFFF" : palette["fg-2"]}
            strokeWidth={2}
          />
          <Text
            className={`text-xs font-semibold ${
              active ? "text-white" : "text-fg-2 dark:text-fg-2-dark"
            }`}
          >
            {label}
          </Text>
        </Pressable>
      );
    })}
  </View>
</View>
```

Ensure the `useTheme()` destructure keeps `{ preference, setPreference }` (already present).

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. (If `Text` isn't imported in more.tsx, it already is.)

- [ ] **Step 4: On-device verification (light + dark)**

With Metro running and Expo Go on the device (see Phase-C device recipe), open More. Set each of System / Light / Dark and confirm: the whole app — home gradient body background, screen backgrounds, cards, status bar text color — flips consistently, with no light-on-dark seams. Toggle the phone's OS theme while set to "System" and confirm the app follows; while set to Light/Dark confirm it does NOT follow the OS. Screenshot Home in both Light and Dark.

- [ ] **Step 5: Commit**

```bash
git add mobile-application/app/(tabs)/more.tsx mobile-application/constants/strings.ts
git commit -m "feat(mobile): System/Light/Dark segmented theme control"
```

---

## Phase B — Branded asset placeholders

### Task B1: ImagePlaceholder component

**Files:**
- Create: `mobile-application/components/ui/image-placeholder.tsx`

**Interfaces:**
- Produces: `<ImagePlaceholder icon? style? iconSize? />` where `icon` is a `lucide-react-native` component (default `ImageIcon`), `style` matches the slot's `ImageStyle` (dimensions + radius), `iconSize` defaults to `26`.

- [ ] **Step 1: Write the component**

```tsx
// mobile-application/components/ui/image-placeholder.tsx
/**
 * Branded fallback for a missing image asset: a brand-tint box (dark-mode
 * aware) with a centered muted glyph. Fills the slot it is given via `style`
 * (same dimensions/radius the real <Image> would have used).
 */
import { Image as ImageIcon, type LucideIcon } from "lucide-react-native";
import { View, type ImageStyle, type StyleProp } from "react-native";

import { palette } from "@/constants/colors";

export function ImagePlaceholder({
  icon: Icon = ImageIcon,
  style,
  iconSize = 26,
}: {
  icon?: LucideIcon;
  style?: StyleProp<ImageStyle>;
  iconSize?: number;
}) {
  return (
    <View
      style={style as StyleProp<import("react-native").ViewStyle>}
      className="h-full w-full items-center justify-center bg-tint dark:bg-surface-dark"
    >
      <Icon size={iconSize} color={palette["fg-2"]} strokeWidth={1.6} />
    </View>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile-application/components/ui/image-placeholder.tsx
git commit -m "feat(mobile): branded ImagePlaceholder for missing assets"
```

### Task B2: AssetImage defaults to the placeholder

**Files:**
- Modify: `mobile-application/components/ui/asset-image.tsx`

**Interfaces:**
- Consumes: `ImagePlaceholder`, `LucideIcon`.
- Produces: `<AssetImage>` gains optional `placeholderIcon?: LucideIcon`. When no `fallback` is passed, it defaults to `<ImagePlaceholder icon={placeholderIcon} style={style} />`. Explicit `fallback` still wins (avatars keep their initials).

- [ ] **Step 1: Update AssetImage**

```tsx
// mobile-application/components/ui/asset-image.tsx
import { useState, type ReactNode } from "react";
import {
  Image,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { type LucideIcon } from "lucide-react-native";

import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { isRenderableAssetUrl } from "@/lib/asset-url";

interface AssetImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  /** Explicit fallback (e.g. initials). If omitted, a branded ImagePlaceholder is used. */
  fallback?: ReactNode;
  /** Glyph for the default ImagePlaceholder when no explicit fallback is given. */
  placeholderIcon?: LucideIcon;
  accessibilityLabel?: string;
}

export function AssetImage({
  uri,
  style,
  resizeMode = "cover",
  fallback,
  placeholderIcon,
  accessibilityLabel,
}: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  if (!isRenderableAssetUrl(uri) || failed) {
    return (
      <>
        {fallback ?? <ImagePlaceholder icon={placeholderIcon} style={style} />}
      </>
    );
  }

  return (
    <Image
      source={{ uri: uri as string }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
```

Note the behavior change: spots that previously passed no `fallback` (seal watermarks) now render a subtle tint box. That is fine for content images; for the tiny decorative watermarks it is acceptable but verify on-device in B4 — if a watermark looks wrong, pass an explicit `fallback={null}` at that call site.

- [ ] **Step 2: Typecheck + existing tests**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (asset-url and other suites unaffected).

- [ ] **Step 3: Commit**

```bash
git add mobile-application/components/ui/asset-image.tsx
git commit -m "feat(mobile): AssetImage defaults to branded placeholder"
```

### Task B3: Apply content-appropriate placeholder icons

**Files (each an `AssetImage`/`<Image>` content spot):**
- Modify: `mobile-application/components/home/announcements-carousel.tsx` — replace the `fallback={<View className="h-[120px] w-full bg-tint" />}` with `placeholderIcon={Newspaper}` (drop the inline fallback), import `Newspaper` from `lucide-react-native`.
- Modify: `mobile-application/app/(tabs)/news.tsx` — post hero → `placeholderIcon={Newspaper}`.
- Modify: `mobile-application/app/news/[id].tsx` — article hero → `placeholderIcon={Newspaper}`.
- Modify: `mobile-application/app/tourism/[id].tsx` — detail image → `placeholderIcon={MapPin}`.
- Modify: `mobile-application/components/places/place-card.tsx` — card image → `placeholderIcon={MapPin}` (covers tourism grid, directory, nearby via reuse; verify).
- Modify: `mobile-application/components/home/nearby-strip.tsx` — if it renders its own image (not via place-card), `placeholderIcon={MapPin}`.
- Modify: `mobile-application/app/report/[ticketId].tsx` and `mobile-application/app/report/index.tsx` — report photo previews → `placeholderIcon={ImageIcon}` (only where showing a remote/stored photo; leave the local-capture preview as-is).

For each file:

- [ ] **Step 1: Read the file, locate the image render, and set `placeholderIcon` (add the lucide import).** Remove any now-redundant inline `fallback` that only drew a blank box. Keep initials fallbacks for avatars untouched.

- [ ] **Step 2: Typecheck + lint after each file**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit (one commit for the batch)**

```bash
git add mobile-application/components/home/announcements-carousel.tsx mobile-application/app/(tabs)/news.tsx mobile-application/app/news/[id].tsx mobile-application/app/tourism/[id].tsx mobile-application/components/places/place-card.tsx mobile-application/components/home/nearby-strip.tsx mobile-application/app/report/[ticketId].tsx mobile-application/app/report/index.tsx
git commit -m "feat(mobile): content-appropriate placeholders for missing images"
```

### Task B4: On-device verification of placeholders

- [ ] **Step 1:** With the app running, view Home (Announcements now shows a newspaper-glyph tint card, not a blank box), News feed, a News article, Tourism grid + detail, Directory, and the nearby strip. Confirm every missing image shows the branded placeholder in BOTH light and dark. Screenshot Home Announcements and the News feed. If any decorative seal watermark looks wrong, set `fallback={null}` at that call site and re-verify.

---

## Phase C — Per-screen audit + wiring/behavior fixes

This phase is discovery-driven. Each task audits a screen group on the device against the live backend, fixes what is broken, and re-verifies. Do NOT pixel-chase; fix errors, empty/wrong data, broken actions, and theme/asset regressions. Add a backend endpoint only if a feature has no server support (see Task C-BACKEND guard).

**Device recipe (used by every Phase-C task):**
- Ensure the containerized backend is up and Metro is running on the LAN (`EXPO_PUBLIC_API_URL=http://192.168.110.251:3005`, `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.110.251`, `--port 8081`), Expo Go launched via `adb shell am start -a android.intent.action.VIEW -d "exp://192.168.110.251:8081" host.exp.exponent`.
- Navigate with `adb shell input tap X Y` / `input text`; capture with `adb exec-out screencap -p > shot.png` (via Bash, byte-exact) and read the PNG.
- Reference design: `docs/designs/extracted/screens/dasma/<screen>.png`.

**Fix loop per screen:** open → screenshot (light) → note defects (error, empty, wrong data, broken action, theme/asset) → fix in code → reload → re-screenshot to confirm → screenshot once in dark → commit.

- [ ] **Task C1 — Auth group:** onboarding, login, otp. Verify config-driven slides, +63 entry, OTP request→verify, guest, error states. Fix findings. Commit.
- [ ] **Task C2 — Home + Notifications + Search:** header/bell/mayor/grid/announcements/weather/nearby/digital-id promo; notifications list + mark-read + unread badge; search sections + recents + quick actions. Fix findings. Commit.
- [ ] **Task C3 — e-Gov group:** catalog, service detail, form, review (fee + ₱20), payment (GCash/Card), success QR stub, My Applications, application timeline. Fix findings. Commit.
- [ ] **Task C4 — Reports group:** categories, form (photo, geo pin, description), success timeline, My Reports, report detail. Fix findings. Commit.
- [ ] **Task C5 — Assistance + SOS + Hotlines:** programs list, detail, apply; SOS hold-to-activate + live location + I'm-safe + degraded dial; hotlines search + tap-to-call + tags. Fix findings. Commit.
- [ ] **Task C6 — Discovery group:** news feed + article, tourism grid + detail (favorite ♥, directions), directory, transport (From→To match, fares). Fix findings. Commit.
- [ ] **Task C7 — Identity + More group:** digital ID (QR, validity, public verify), profile edit, language EN/FIL toggle, FAQ, feedback, sign out. Fix findings. Commit.

**Task C-BACKEND (conditional):** If any C-task finds a feature with no server support, add it properly:
- Endpoint in the owning service (`apps/<x>-service`) as a `@MessagePattern` handler + gateway controller route with class-validator DTO, tenant scoping, `{PREFIX}-` ids where applicable.
- Add a `check(...)` to `backend/scripts/verify-e2e.ts` covering it.
- Rebuild the affected image (`docker compose ... up -d --build <service> api-gateway`), run `npx ts-node -P tsconfig.scripts.json scripts/verify-e2e.ts`, expect `0 failed`.
- Commit backend + mobile together.

---

## Final Verification

- [ ] **Step 1:** `cd mobile-application && npx tsc --noEmit` → clean.
- [ ] **Step 2:** `npm run lint` → clean.
- [ ] **Step 3:** `npm test` → all suites green (includes new `theme-mode` test).
- [ ] **Step 4:** `npx expo export --platform web` → builds (catches bundler/asset issues).
- [ ] **Step 5:** On-device regression: cold-launch the app, confirm the persisted theme is restored with no flash; walk the full tab bar once in Light and once in Dark; confirm no light-on-dark seams and every missing image shows the branded placeholder.
- [ ] **Step 6:** If backend was touched: `verify-e2e.ts` against the container stack → `0 failed` across 3 tenants.
- [ ] **Step 7:** Confirm no per-tenant code branches were introduced: `git diff master...feat/mobile-functional-fix` shows no tenant-string conditionals in `app/`/`components/`.

---

## Self-Review Notes

- **Spec coverage:** A1–A4 cover the theme workstream (root cause, single source, startup restore, 3-mode control); B1–B4 cover asset placeholders (component, AssetImage default, application, verification); C1–C7 cover the per-screen audit; C-BACKEND covers the "add endpoint if missing" clause; Final Verification covers the spec's testing section.
- **Type consistency:** `ThemePreference` ("system"|"light"|"dark") is defined in A1 and used identically in A2/A4; `useThemeMode()` returns `{preference,setPreference,scheme}` in A2 and consumed in A3/A4; `ImagePlaceholder({icon,style,iconSize})` in B1 matches its use in B2/B3.
- **Legacy value:** any previously stored `"auto"` normalizes to `"system"` (A1 test), so no migration step is needed.
