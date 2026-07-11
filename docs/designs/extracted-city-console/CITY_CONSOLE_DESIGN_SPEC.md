# City Console (Tenant/LGU Admin Panel) — UI/UX Design Specification

Extracted from `docs/designs/CityConsole_Standalone.html` (Claude Design desktop prototype,
1440×940 canvas, themed as **MyLegazpi**: Mayon teal `#0E5C74` + Lava Orange `#F26B21`).
All values are taken verbatim from the prototype's markup/logic and verified via
`getComputedStyle` on the rendered DOM. Written for a React + plain-CSS implementation.
Screenshots referenced throughout live in `./screens/`.

> **Scope note:** This prototype is the single-tenant LGU console (tenant_admin, `:8091`).
> Screens: Login → Dashboard / Branding Studio / Modules (read-only) / Content /
> Operations (3 sub-tabs) / Audit log / Style Guide, plus transition dialogs and toasts.
> It maps 1:1 to the real tenant-admin-panel page set, with two deltas noted in §8/§9.

---

## 1. Color system

### 1.1 TENANT-DERIVED tokens (become `var(--primary)` etc. from runtime config)

The prototype pins these on the app root as CSS custom properties. **In the real app all
six are functions of the tenant's two config colors** (`branding.primaryColor`,
`branding.accentColor`) — hydrate them at boot from `/v1/config` exactly like the mobile app:

```css
:root {
  --primary:      #0E5C74;  /* tenant primary (Mayon teal)                    */
  --primary-dark: #083A4C;  /* ≈ darken(primary, 35–40%) — gradient end       */
  --primary-soft: #E4F2F5;  /* ≈ 8–11% tint of primary on white               */
  --accent:       #F26B21;  /* tenant accent (Lava Orange)                    */
  --accent-deep:  #C94F10;  /* ≈ darken(accent, ~20%) — text-on-soft          */
  --accent-soft:  #FDEBDF;  /* ≈ 12–15% tint of accent on white               */
}
```

Derivation guidance (verified against the prototype's own JS helpers):

- The prototype ships `darken(hex, f)` (multiply each channel by `1−f`) and
  `hexA(hex, a)` (hex→rgba). Its Style Guide computes "Primary dark" as
  `darken(primary, .35)` → `#093C4B` and "Accent deep" as `darken(accent, .2)` → `#C2561A`;
  the seeded root vars (`#083A4C`, `#C94F10`) are hand-tuned versions of the same idea.
  **If the tenant config ships all four (primary/primaryDark/accent/accentDeep), use them
  verbatim; only fall back to `darken(primary, .38)` / `darken(accent, .2)`.**
- Soft tints: `color-mix(in srgb, var(--primary) 10%, white)` and
  `color-mix(in srgb, var(--accent) 12%, white)` reproduce the seeded values closely.
- Alpha tints used throughout (compute from the hex, never hard-code):
  - `hexA(primary, .10)` — phone-preview tile bg (primary slot)
  - `hexA(accent, .12)` — phone-preview tile bg (accent slot)
  - `hexA(primary, .28–.34)` — primary-button shadows · `hexA(primary, .4)` — logo-tile shadow
  - `hexA(primary, .18)` — phone-preview card shadow
  - `hexA(primary, .06)` / `hexA(accent, .06)` — stat-card decorative glow circles
  - `hexA(actionColor, .10)` bg / `.25` border — tinted row-action buttons
  - `hexA(statusColor, .12)` — dialog icon tile bg
- **Toast background `#0F2F3A` ≈ `darken(primary, .5)`** — treat it as tenant-derived
  (deep-primary ink), not a neutral.
- **Login backdrop** is also f(primary)+f(accent) — see §5.1.
- Modules callout border `#CBE4EA` ≈ `color-mix(in srgb, var(--primary) 18%, white)`.

Every teal or orange pixel in the prototype comes from one of the above. When restyling the
real SPA, grep the extracted values (`#0E5C74`, `#083A4C`, `#E4F2F5`, `#F26B21`, `#C94F10`,
`#FDEBDF`, `#0F2F3A`, `rgba(14,92,116,…)`, `rgba(242,107,33,…)`) and replace each with the
corresponding var/derivation — none of them may be hard-coded.

Two places in the prototype's JS hard-code `#0E5C74` that are semantically `var(--primary)`:
the **active ops sub-tab** bg/border, the **"forward" row-action color** (Start review /
Mark paid), and the **pin-to-top toggle ON track**. Implement all three as `var(--primary)`.

### 1.2 NEUTRAL / shared tokens (identical across tenants; shared with Platform Console)

```css
:root {
  --bg:      #F6F8F6;   /* page background                                   */
  --surface: #FFFFFF;   /* cards, tables, topbar, dialogs                    */
  --ink:     #1B2A20;   /* primary text                                      */
  --muted:   #6B7C70;   /* secondary text, captions                          */
  --line:    #EAEFEA;   /* hairlines, card/input borders                     */
  --mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

Fixed semantic colors (never tenant-themed):

| Purpose | Value |
|---|---|
| Success (green) | `#1E8449` |
| Warning (amber) | `#B7791F` |
| Danger (red) | `#C0392B` |
| Info (blue) | `#2A5BD7` (PENDING_PAYMENT only) |
| SOS banner (phone preview) | `linear-gradient(100deg, #C62828, #E53935)`, shadow `0 8px 18px rgba(229,57,53,.3)` |
| Table header bg | `#FBFCFD` |
| Toggle track OFF / past version dot | `#D4DAE0` |
| Disabled icon fg / add-on tag fg | `#9AA6B2` |
| Disabled/neutral tile bg | `#F1F3F5` |
| Neutral phone-tile bg / fg | `#EEF1F4` / `#6B7C70` |
| Logout-hover | fg `#C0392B`, border `#F0C9C9` |
| Scrollbar thumb | `#cfd6dd`, 10px, radius 8, 3px transparent border, `background-clip: content-box` |

### 1.3 Status chip colors (bg / fg) — identical to Platform Console

| Status | bg | fg |
|---|---|---|
| RESOLVED, APPROVED, READY, CLAIMED | `#E6F5EC` | `#1E8449` |
| REJECTED, DENIED | `#FDECEC` | `#C0392B` |
| SUBMITTED | `#EEF0F2` | `#6B7C70` |
| UNDER_REVIEW, PROCESSING | `#FEF3E0` | `#B7791F` |
| PENDING_PAYMENT | `#E8EEFB` | `#2A5BD7` |

### 1.4 Category chip colors (bg / fg) — note the two TENANT-DERIVED rows

| Category | bg | fg | Notes |
|---|---|---|---|
| ADVISORY | `#FDECEC` | `#C0392B` | neutral |
| EVENT | `#FEF3E0` | `#B7791F` | neutral |
| PROGRAM | `#F0EBFB` | `#6D4BC7` | neutral |
| **GOVERNANCE** | `#E4F2F5` | `#0E5C74` | **= `--primary-soft` / `--primary`** (platform console used blue) |
| TOURISM | `#E6F5EC` | `#1E8449` | neutral |
| JOBS | `#E8F5F0` | `#1B7F6B` | neutral |
| **CONFIG** (audit) | `#FDEBDF` | `#C94F10` | **= `--accent-soft` / `--accent-deep`** (platform console used indigo) |

Audit categories map: REPORTS→ADVISORY colors? No — audit uses the same table with extra keys:
EGOV falls back to CONFIG colors unless defined; in the prototype `CATCHIP` covers the 6 post
categories + CONFIG; audit events with cats REPORTS/EGOV/ASSIST/CONTENT fall back to CONFIG
(accent-tinted). Rendered result (see `08-audit.png`): every audit icon tile and chip that
isn't one of the 6 post categories is **accent-soft/accent-deep**.

---

## 2. Typography

- **UI family:** `'Plus Jakarta Sans', system-ui, sans-serif` (embedded 400/500/600/700/800).
- **Mono family:** `'JetBrains Mono', ui-monospace, monospace` (embedded 400/500/600) — all
  machine identifiers: ticket ids (`LGZ-000012`), tenant id (`ph-albay-legazpi`), hex values,
  timestamps, feedback timestamps.
- Same "uppercase kicker" signature as the platform console: 800 weight + 1–1.6px tracking
  at 9.5–11px, UPPERCASE.

| Role | Size | Weight | Tracking | Color |
|---|---|---|---|---|
| Page H1 ("Branding Studio", "Kumusta, Maria 👋") | 24px | 800 | −0.4px | `--ink` |
| **Page kicker** ("FLAGSHIP", "SERVICE DESK", "BAGONG LEGAZPI!") | 10px | 800 | +1.2px | **`--primary`** |
| Card kicker ("PRIMARY COLOR", "VERSION HISTORY") | 10–11px | 800 | +1–1.2px | `--muted` |
| Topbar page title | 16px | 800 | −0.3px | `--ink` |
| Login title | 18px | 800 | −0.3px | |
| Dialog title | 16px | 800 | | |
| Stat value | 30px | 800 | −0.5px | `--primary` (or `--accent` for config version) |
| Stat label | 12px | 500 | | `--muted`, 2px top |
| Card section title ("Compose post") | 15px | 800 | | |
| Sidebar wordmark | 14px/800 white + sub 9.5px/700 ls 1.6 `rgba(255,255,255,.62)` | | | |
| Nav item | 13.5px | 600 (active 800) | | see §4.2 |
| Table column header | 10px | 800 | +1px | `--muted`, UPPERCASE |
| Table primary/mono cell | 12.5px mono/600 · body 13px | | | |
| Buttons | 12–14.5px | 700 | | |
| Field label | 11px | 600 | | `--muted`, 5–6px below-margin |
| Login field label | 12px | 700 | | `--ink` |
| Chips | 10–11.5px | 700–800 | | |
| Mono timestamps | 10.5–12px | 400 | | `--mono`, `--muted` |
| Quick-link title / sub | 13.5px/700 · 11.5px `--muted` | | | |

---

## 3. Layout

Prototype canvas: fixed 1440×940, radius 14, `box-shadow: 0 40px 120px rgba(10,14,25,.4)`
(canvas framing only). In the SPA use full viewport.

```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │ Topbar (66px, white, 1px --line bottom)  │
│ 238px    ├──────────────────────────────────────────┤
│ tenant   │ Content scroll area                      │
│ teal     │  padding: 28px 30px 40px                 │
│ gradient │  page wrapper max-width (varies) center  │
└──────────┴──────────────────────────────────────────┘
```

- **Sidebar (tenant-themed — the big difference vs platform console):** width **238px**,
  `background: linear-gradient(180deg, var(--primary-dark), var(--primary))`,
  `overflow: hidden`. Three zones + one watermark:
  1. **Watermark:** absolutely positioned Mayon-triangle SVG (`path "M12 3 L21 20 L3 20 Z"`,
     fill `#fff`), 220×220, `right: -40px; bottom: 60px; opacity: .09`.
  2. **Brand header:** `padding: 22px 20px 20px; border-bottom: 1px solid rgba(255,255,255,.12)`;
     40px logo tile (radius 11, bg `rgba(255,255,255,.14)`, border `1px solid rgba(255,255,255,.18)`,
     24px volcano mark: white triangle + primary-colored crater notch) + wordmark
     (tenant app name 14px/800 white ls −0.2 · "CITY CONSOLE" 9.5px/700 ls 1.6
     `rgba(255,255,255,.62)`, 4px top).
  3. **Nav:** `padding: 16px 14px; flex: 1`. No section labels (unlike platform console).
  4. **Footer:** `padding: 16px; border-top: 1px solid rgba(255,255,255,.12)`; tenant id
     mono 11px `rgba(255,255,255,.55)` (`ph-albay-legazpi`). No avatar block.
- **Topbar:** 66px, `--surface`, `border-bottom: 1px solid var(--line)`, `padding: 0 30px`,
  gap 14. Contents: 34px logo tile (radius 10, `linear-gradient(140deg, var(--primary),
  var(--primary-dark))`, 19px white volcano mark) → page title (16px/800 ls −0.3; Dashboard
  titles it "MyLegazpi — City Console") → spacer → identity (name 13px/700 lh 1.1 + email
  11px `--muted`, right-aligned) → role badge → 38px logout icon button. **No search box,
  no breadcrumbs** (single-tenant scope).
  - Role badge: `background: var(--primary-soft); color: var(--primary-dark);
    font-size: 10.5px; font-weight: 700; padding: 5px 11px; border-radius: 20px` ("Tenant admin").
  - Logout button: `38×38; border-radius: 10px; background: var(--bg); border: 1px solid
    var(--line); color: var(--muted)`; hover `color: #C0392B; border-color: #F0C9C9`.
- **Content:** scrollable, `padding: 28px 30px 40px`; each page wraps in a centered
  max-width container with `animation: fadeUp .3s ease`. **Max-widths vary per page:**
  Dashboard/Content/Operations/Style Guide **1120px** · Branding Studio **1180px** ·
  Audit **1000px** · Modules **900px**.
- **Page header:** kicker (10px, `--primary`) + H1 24px, 6px apart, 16–20px bottom margin.
  Branding Studio adds a right-aligned primary CTA on the header row
  (`display:flex; align-items:flex-end; justify-content:space-between`).

### Page grids

| Page | Grid |
|---|---|
| Dashboard stats | `repeat(4, 1fr)` gap 16 |
| Dashboard body | `1.5fr 1fr` gap 18, margin-top 20 (activity card · quick-links column gap 14) |
| Branding Studio | `1fr 380px` gap 22, `align-items: start` (editor column gap 18 · sticky preview) |
| Branding assets row | `1fr 1fr` gap 18 (logo assets · onboarding slides) |
| Modules | `repeat(2, 1fr)` gap 14 |
| Content | `1.25fr 1fr` gap 18 (compose · feedback) |
| Style guide | `1fr 1fr` gap 18 |

---

## 4. Components

### 4.1 Login screen (`01-login.png`)

- **Backdrop — f(primary) + f(accent):**
  ```css
  background: radial-gradient(1100px 640px at 30% -10%, #123A48, #0C2630 62%, #08161C);
  /* ≈ radial of darken(primary, .40) → darken(primary, .60) 62% → darken(primary, .78) */
  /* grid overlay layer at opacity .5: */
  background-image:
    linear-gradient(rgba(242,107,33,.05) 1px, transparent 1px),      /* hexA(accent,.05) */
    linear-gradient(90deg, rgba(242,107,33,.05) 1px, transparent 1px);
  background-size: 46px 46px;
  ```
  (Same blueprint-grid pattern as the platform console, but teal glow at **top-left** and
  **accent-orange** grid lines instead of indigo.)
- **Card:** `width: 404px; background: var(--surface); border-radius: 20px;
  padding: 38px 36px 34px; box-shadow: 0 30px 80px rgba(0,0,0,.5)`, `fadeUp .4s`.
- Header: 46px logo tile (radius 13, `linear-gradient(140deg, var(--primary), var(--primary-dark))`,
  `box-shadow: 0 8px 20px hexA(primary,.4)`, volcano mark w/ accent spark) + "City Console"
  18px/800 + "Local government administration" 12px `--muted`; divider 1px `--line` 22px 0.
- Labels 12px/700 `--ink`; inputs `1.5px solid var(--line)`, radius 11, `padding: 13px 14px`,
  14px/500, bg `#FBFCFD` → focus `border-color: var(--primary); background: #fff`.
- Full-width primary "Sign in": `linear-gradient(135deg, var(--primary), var(--primary-dark));
  padding: 14px; border-radius: 12px; font-size: 14.5px; font-weight: 700;
  box-shadow: 0 10px 24px hexA(primary,.34)`; hover `filter: brightness(1.08)`.
- Footer: "City Government of Legazpi · authorized staff only" 11.5px `--muted` centered 18px top.
- Email prefilled `admin@legazpi.gov.ph`. **No error-banner state exists in this prototype.**

### 4.2 Sidebar nav item

```css
/* base */
width: 100%; display: flex; align-items: center; gap: 12px;
padding: 11px 12px; border-radius: 11px; margin-bottom: 4px; text-align: left;
color: rgba(255,255,255,.72); font-size: 13.5px; font-weight: 600;
transition: .15s; position: relative;
/* hover (inactive) */ background: rgba(255,255,255,.06);
/* ACTIVE */ background: rgba(255,255,255,.12); color: #fff; font-weight: 800;
/* ACTIVE accent bar (left edge) */
span { position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px;
       border-radius: 3px; background: var(--accent); }
/* icon: 19×19 stroke icon, stroke-width 2, currentColor */
```
Items (top→bottom): Dashboard, Branding, Modules, Content, Operations, Audit log, Style Guide.
No count badges. **The 3px accent bar on the active item is a signature detail.**

### 4.3 Dashboard stat card (`02-dashboard.png`)

```css
background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
padding: 18px 20px; box-shadow: 0 4px 14px rgba(20,30,40,.04);
position: relative; overflow: hidden;
/* decorative glow circle */ position: absolute; right: -10px; top: -10px;
   width: 60px; height: 60px; border-radius: 50%; background: hexA(themeColor, .06);
/* icon tile */ 38px; border-radius: 11px; tinted bg + colored fg; 19px stroke icon
/* value */ font-size: 30px; font-weight: 800; letter-spacing: -.5px; margin-top: 12px;
/* label */ font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px;
```
The four cards: Open reports (icon `#FDECEC`/`#C0392B`, value `--primary`) ·
Applications in progress (icon `--primary-soft`/`--primary`, value `--primary`) ·
Assistance pending (icon `--accent-soft`/`--accent-deep`, value `--primary`) ·
Config version "v6" (icon `--accent-soft`/`--accent-deep`, **value `--accent`**).

### 4.4 Latest-activity card + quick links (Dashboard)

- **Activity card:** generic card (16px radius, padding 22) with header row
  (title 15px/800 ↔ text-button "View audit log →" 12px/700 **`--primary`**), then rows:
  `display: flex; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line)`:
  category chip (10px/800/ls .4, `padding: 3px 9px; radius 14`, CATCHIP colors) +
  title 13px/600 flex 1 + timestamp mono 11px `--muted` (mm-dd hh:mm).
- **Quick links:** kicker "QUICK LINKS" then cards
  `background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
  padding: 16px 18px; display: flex; gap: 14px; box-shadow: 0 4px 12px rgba(20,30,40,.04);
  transition: .14s;` hover **`border-color: var(--primary); transform: translateY(-1px)`**.
  40px icon tile (radius 11; tints: primary-soft/primary, accent-soft/accent-deep,
  `#E6F5EC`/`#1E8449`) + title/sub + 17px chevron `--muted`.

### 4.5 Buttons

| Variant | Style |
|---|---|
| **Primary (gradient)** | `background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; font-weight: 700; font-size: 13.5px; padding: 12px 20px; border-radius: 12px; box-shadow: 0 10px 24px hexA(primary,.28)`; hover `filter: brightness(1.07)`. Full-width variants: login (14.5px/`14px` pad, shadow `.34`), "Publish & push" (`padding: 12px; radius 11`, no shadow). Leading icon 16px, gap 9 ("Save changes" has save icon). |
| **Accent (style guide only)** | solid `var(--accent)`, white, `padding: 11px 18px; radius 11`. |
| **Ghost** | `background: var(--bg); border: 1px solid var(--line); color: var(--ink)` (dialog Cancel uses `color: var(--muted)`); 13px/700; `padding: 11px 18px; radius 10–11`. |
| **Solid status (dialog confirm)** | solid `#1E8449`/`#B7791F`/`#C0392B` by transition, white text, `padding: 11px 22px; radius 10`. |
| **Tinted row action** | `font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 9px; background: hexA(c,.1); color: c; border: 1px solid hexA(c,.25)` where c = **`var(--primary)`** for forward transitions, `#1E8449` positive-terminal, `#C0392B` reject/deny. |
| **Text link** | 12px/700 `var(--primary)` ("View audit log →"). |
| **Icon button** | 38px square, radius 10, `--bg` bg, `--line` border, `--muted` fg. |

### 4.6 Inputs / labels

```css
/* label */ font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 5-6px;
/* input/textarea */
width: 100%; border: 1.5px solid var(--line); border-radius: 10px;
padding: 11px 13px; font-size: 13.5px; font-weight: 600 (identity) / 400 (compose);
outline: none; background: #fff;
/* FOCUS */ border-color: var(--primary);   /* border swap only, no ring */
/* textarea */ height: 100px (compose body) / 76px (dialog note); resize: none;
/* dialog small inputs */ padding: 10px 12px; font-size: 13px;
```

### 4.7 Operations sub-tab pills (`05/06/07-operations-*.png`)

```css
display: flex; gap: 8px; margin-bottom: 16px;
/* pill */ display: flex; align-items: center; gap: 8px; padding: 9px 15px;
border-radius: 20px; font-size: 13px; font-weight: 700;
/* inactive */ background: #fff; color: var(--muted); border: 1px solid var(--line);
/* ACTIVE   */ background: var(--primary); color: #fff; border-color: var(--primary);
/* count pill */ font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 10px;
/* inactive: bg #F1F3F5 fg --muted · active: bg rgba(255,255,255,.2) fg #fff */
```
(Platform console used near-black `#141821` for the active pill; here it is **`--primary`**.)

### 4.8 Operations table

Same construction as the platform console (CSS grid rows in a card):
- Card: `radius 16; overflow: hidden; box-shadow: 0 8px 24px rgba(20,30,40,.05)`.
- Header row: `padding: 13px 22px; background: #FBFCFD; border-bottom: 1px solid var(--line)`;
  cells 10px/800/ls 1/UPPERCASE `--muted`.
- Body row: `padding: 15px 22px; border-bottom: 1px solid var(--line); align-items: center`.
- **One grid template for all three tabs:** `1.3fr 1.3fr 1.3fr .9fr 1.2fr`.
- Columns: 311 → Ticket/Category/Department/Status/Action · e-Gov → Stub/Service/Fees/Status/Action ·
  Assistance → Request/Program/Checklist/Status/Action.
- Cells: id mono 12.5px/600 · c1 13px `--ink` · c2 13px `--muted` · status chip
  (11px/700, `padding: 4px 10px; radius 20; white-space: nowrap`) · actions right-aligned gap 7.
- Terminal rows: italic 11.5px `--muted` "closed".
- No row icons/avatars (unlike platform tenant table), no pagination, no empty states.

Status machines (actions rendered per row): 311 `SUBMITTED→[Start review]`,
`UNDER_REVIEW→[Resolve|Reject]` · e-Gov `PENDING_PAYMENT→[Mark paid]`, `PROCESSING→[Mark ready]`,
`READY→[Mark claimed]` · Assistance `SUBMITTED→[Start review]`, `UNDER_REVIEW→[Approve|Deny]`.

### 4.9 Transition dialog (`05b/05c/05d/06b/07b/07c-dialog-*.png`)

- **Scrim:** `rgba(15,18,28,.5); backdrop-filter: blur(2px)`, `fadeIn .18s`.
- **Card:** `width: 440px; border-radius: 18px; padding: 26px; background: var(--surface);
  box-shadow: 0 30px 80px rgba(0,0,0,.4)`, `fadeUp .25s`.
- Header: 42px icon tile `radius 12; background: hexA(statusColor,.12); color: statusColor`
  with 21px check icon (always a check, regardless of transition) + title 16px/800 +
  ticket id mono 12.5px `--muted`.
- **Status color rule** (independent of the row-button color): target status REJECTED/DENIED →
  `#C0392B`; UNDER_REVIEW/PROCESSING → `#B7791F`; everything else (RESOLVED/APPROVED/READY/
  CLAIMED) → `#1E8449`. So "Start review"/"Mark paid" rows have a **primary-teal** row button
  but an **amber** dialog.
- Body: label "Note (attached to audit trail)" + 76px textarea.
- **Approve only:** extra 2-col row (`1fr 1fr` gap 12, `fadeIn .2s`) — "Claim date"
  (`2026-07-15`) + "Claim location" (`City Hall · Window 4`).
- Footer right-aligned gap 10: Cancel (ghost) + solid status-colored confirm
  (`padding: 11px 22px; radius 10`).
- Confirm → updates chip, prepends an audit event, toast "Status updated → APPROVED".

### 4.10 Toast (`04c`, `07d`, `10d`)

```css
position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%);
background: #0F2F3A;            /* ≈ darken(var(--primary), .5) — tenant-derived ink */
color: #fff; font-size: 13px; font-weight: 600; padding: 13px 20px;
border-radius: 13px; box-shadow: 0 16px 40px rgba(0,0,0,.35);
display: flex; align-items: center; gap: 11px; white-space: nowrap;
animation: toastIn .3s ease;    /* auto-dismiss ~2.2s */
/* leading tile: 22px; radius 7; background: var(--accent); white 13px check */
```
Messages: "Post published & pushed", "Status updated → APPROVED", "Saved v7".

### 4.11 Modules page (read-only) (`03-modules.png`)

- **Lock callout:** `display: flex; gap: 11px; background: var(--primary-soft);
  border: 1px solid #CBE4EA /* ≈ 18% primary tint */; border-radius: 12px;
  padding: 13px 16px; color: var(--primary-dark); font-size: 12.5px; font-weight: 600;`
  17px lock icon. Copy: "Module availability is managed by the platform operator. Contact
  your account manager to change your subscription tier."
- **Module card:** `background: var(--surface); border: 1px solid var(--line);
  border-radius: 14px; padding: 16px 18px; display: flex; align-items: center; gap: 14px;`
  **disabled cards get `opacity: .55`** (whole card).
  - Icon tile 42px radius 11: ON `--primary-soft`/`--primary` · OFF `#F1F3F5`/`#9AA6B2`.
  - Title 14px/700 + desc 11.5px `--muted` (2px top).
  - **Tag chip** (replaces the platform console's toggle): 11px/700,
    `padding: 4px 10px; radius 20` — "Included" `#E6F5EC`/`#1E8449` · "Add-on" `#F1F3F5`/`#9AA6B2`.
- 10 modules seeded; Health + Jobs are Add-on/off.

### 4.12 Content page (`04-content.png`)

- **Compose card** (left, 1.25fr): title 15px/800; fields gap 13.
  - Category chips: `font-size: 11.5px; font-weight: 700; padding: 6px 12px; radius 18`;
    inactive `#fff` bg / `--muted` fg / `--line` border; active = category bg/fg +
    `1px solid <fg>` (see §1.4; GOVERNANCE active = primary-soft/primary).
  - **Pin-to-top toggle:** track `40×24; radius 16;` ON **`var(--primary)`** / OFF `#D4DAE0`;
    knob 18px white circle, `top: 3px; left: 3px → 19px`, `box-shadow: 0 1px 3px rgba(0,0,0,.3)`,
    `transition: .15s`; label 12.5px/600 gap 9.
  - Hero-image stub: `border: 1.5px dashed var(--line); radius 10; padding: 8px 14px;
    font-size: 12px; color: var(--muted); font-weight: 600` ("＋ Hero image").
  - Full-width gradient "Publish & push".
- **Feedback inbox** (right): rows `border: 1px solid var(--line); radius 12;
  padding: 13px 14px; gap 11 column` — name 13px/700 ↔ timestamp mono 10.5px `--muted`;
  message 12.5px `--muted` lh 1.5, 5px top.

### 4.13 Branding Studio (`10-branding-studio*.png`) — the flagship page

Layout: `grid-template-columns: 1fr 380px; gap: 22px; align-items: start`; right column
`position: sticky; top: 0`. Header CTA "Save changes" (gradient primary + save icon).

**Editor column (cards, gap 18):**
1. **Color card** — kickers "PRIMARY COLOR" / "ACCENT COLOR" (18px between groups); swatch
   rows `display: flex; gap: 10px; margin-top: 12px`:
   ```css
   /* swatch button */ flex: 1; height: 50px; border-radius: 12px; background: <color>;
   border: 3px solid transparent;  /* SELECTED: 3px solid darken(color, .25) */
   hover: transform: scale(1.03);
   /* selected overlay */ centered 20px white check, stroke-width 3
   ```
   Prototype choices are the three tenant palettes: primaries `#0E5C74 #1B4F9C #1E8449`,
   accents `#F26B21 #D62839 #F1C40F`. (Real app: replace with free color input; keep the
   selected-swatch treatment for presets.)
2. **Identity card** — kicker "IDENTITY"; App name / Slogan / Executive (Mayor) inputs
   (13.5px/600). Executive row is `flex; gap: 12px; align-items: flex-end` with a 52px
   dashed photo stub (`1.5px dashed var(--line); radius 12;` camera icon `--muted`).
3. **Logo assets + Onboarding slides** (2-col grid):
   - Upload zone: `border: 1.5px dashed var(--line); border-radius: 11px; padding: 12px;
     display: flex; gap: 11px;` hover `border-color: var(--primary)`. 34px icon tile
     (radius 9, **`--primary-soft`/`--primary`**, 16px upload icon) + label 12.5px/700 +
     hint 10.5px `--muted`. Zones: City seal (SVG/PNG · square), Mascot (SVG/PNG),
     Watermark (PNG · transparent).
   - Onboarding row: `border: 1px solid var(--line); radius 10; padding: 9px 11px; gap: 10;`
     24px number tile (radius 7, **`--accent-soft`/`--accent-deep`**, 11px/800) +
     title 12px/700 flex 1 + 14px pencil icon `--muted`.

**Preview column:**
- Header: 8px dot `background: var(--accent); box-shadow: 0 0 8px var(--accent)` (glow) +
  "LIVE PREVIEW" 11px/800/ls 1 `--muted` uppercase; 12px below.
- **Phone frame:** outer card `width: 340px; background: var(--surface); border: 1px solid
  var(--line); border-radius: 26px; padding: 14px; box-shadow: 0 20px 50px hexA(primary,.18)`;
  inner screen `312×520; border-radius: 20px; overflow: hidden; background: #F6F8F6;
  border: 1px solid var(--line)`.
- **Phone content renders from the DRAFT brand state** (`pvPrimary` = draft primary,
  `pvDark` = `darken(draftPrimary, .4)`, `pvAccent`, slogan, exec — updates keystroke-live):
  - Hero: `linear-gradient(135deg, pvDark, pvPrimary); padding: 14px 16px 44px` — 30px logo
    tile `rgba(255,255,255,.16)`, greeting ("Magandang umaga 👋" 9px `rgba(255,255,255,.8)` +
    "Juan Dela Cruz" 12px/700 white), 30px round avatar `background: pvAccent` "JD";
    white search pill (radius 11, `padding: 9px 11px`, 11px `--muted` "Maghanap ng serbisyo…").
  - SOS banner overlapping hero (`margin-top: -26px`): fixed red gradient (§1.2), radius 14.
  - "Mga Serbisyo" 12px/800; **tile grid `repeat(4, 1fr)`**: 38px tiles radius 11; bg/fg cycle
    by index%3 → `hexA(pvPrimary,.1)`/pvPrimary · `hexA(pvAccent,.12)`/pvAccent ·
    `#EEF1F4`/`#6B7C70`; labels 8px/600.
  - Mayor's Corner card: `linear-gradient(120deg, pvDark, pvPrimary); radius 13` — 42px white
    circle avatar, "MAYOR'S CORNER" 8px/800/ls 1 **in pvAccent**, slogan 11.5px/800 white,
    exec 9px `rgba(255,255,255,.8)`.
- **Version history mini-card** (16px below preview): card radius 14, `padding: 14px 16px`;
  kicker "VERSION HISTORY"; rows `flex; gap: 10px; padding: 6px 0` — 9px dot
  (**current: `var(--primary)`**, past `#D4DAE0`) + label 12px (current 800 "v6 · current",
  past 600) + spacer + mono timestamp 10.5px `--muted`. (Simpler than the platform console's
  railed timeline.)
- **Save behavior:** "Save changes" bumps version and toasts "Saved v7"; the shell's root
  vars do NOT change in the prototype (only the phone preview re-themes from draft state).
  In the real app a saved config version re-themes the whole console on next config fetch.

### 4.14 Audit page (`08-audit.png`)

Card `radius 16; padding: 8px 4px; shadow 0 8px 24px rgba(20,30,40,.05)`; rows
`flex; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--line)`:
34px icon tile (radius 9, category bg/fg, 17px stroke icon — reports=triangle-alert,
egov=bank, assist=heart, content=news, config=brush) → category chip (10px/800/ls .5,
`3px 9px`, radius 14) → title 13.5px/600 flex 1 → actor 12px `--muted` → timestamp mono
11.5px `--muted` `min-width: 145px` right-aligned. Categories/colors per §1.4.

### 4.15 Style Guide page (`09-styleguide.png`)

2×2 card grid: Tenant palette (6 swatches 54px radius 11 with name 11.5px/700 + mono hex —
Primary / Primary dark (`darken(p,.35)`) / Accent / Accent deep (`darken(a,.2)`) / Success /
Danger, plus footnote "All colors flow through CSS custom properties (`--primary`,
`--accent`) so the console re-themes per tenant at runtime.") · Status chips + Buttons
(Primary gradient / Accent solid / Ghost) · Typography samples · Phone-frame component note
with slogan pill (`--primary-soft`/`--primary-dark`, radius 11, "🌋 Bagong Legazpi!").

---

## 5. Signature effects & motion

- **Shadow ramp:**
  - subtle card `0 4px 14px rgba(20,30,40,.04)` · quick-link `0 4px 12px rgba(20,30,40,.04)`
  - table/audit card `0 8px 24px rgba(20,30,40,.05)`
  - primary button `0 10px 24px hexA(primary,.28–.34)` (**primary-tinted**)
  - logo tiles `0 8px 20px hexA(primary,.4)`
  - phone preview `0 20px 50px hexA(primary,.18)`
  - dialog `0 30px 80px rgba(0,0,0,.4)` · login card `…,.5` · toast `0 16px 40px rgba(0,0,0,.35)`
  - SOS banner `0 8px 18px rgba(229,57,53,.3)` · accent glow dot `0 0 8px var(--accent)`
- **Gradient recipes (all f(primary)):**
  - buttons/logo tiles: `linear-gradient(135deg, var(--primary), var(--primary-dark))`
    (logo tiles use `140deg`)
  - sidebar: `linear-gradient(180deg, var(--primary-dark), var(--primary))` (dark on TOP)
  - phone hero `135deg` / mayor card `120deg`: `(darken(primary,.4), primary)`
  - login backdrop radial (§4.1)
- **Radii ramp:** phone-frame 26 · screen/login card 20 · dialog 18 · cards/tables 16 ·
  module/quick-link/version cards 14 · toast 13 · callout/swatches/exec-stub 12 ·
  nav item/upload zone/tiles 11 · inputs/onboarding rows 10 · icon tiles 7–13 ·
  chips/pills/badges 14–20.
- **Transitions:** `.14s`–`.15s` micro (nav, quick-links, toggle knob); hover verbs:
  `filter: brightness(1.06–1.08)` (gradient buttons), `transform: scale(1.03)` (swatches),
  `translateY(-1px)` + border-primary (quick links), `border-color: var(--primary)`
  (upload zones), `background: rgba(255,255,255,.06)` (inactive nav).
- **Keyframes** (verbatim):
  ```css
  @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
  @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes toastIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
  ```
  Usage: page entrance `fadeUp .3s`, login card `fadeUp .4s`, login/shell fade `fadeIn .3s`,
  dialog scrim `fadeIn .18s` + card `fadeUp .25s`, claim-fields reveal `fadeIn .2s`,
  toast `toastIn .3s`. (`spin`, `floatY` defined but unused.)
- **Base resets:** `* { box-sizing: border-box; -webkit-tap-highlight-color: transparent }`;
  buttons inherit font, no border/bg, `cursor: pointer`; inputs inherit font; webkit
  scrollbar per §1.2.

---

## 6. Screen inventory (screenshot → route)

| Screenshot (`screens/`) | Route / state |
|---|---|
| `01-login.png` | `/login` — teal radial backdrop, orange grid, email prefilled |
| `02-dashboard.png` | `/dashboard` — slogan kicker, greeting H1, 4 stat cards, latest activity, quick links |
| `03-modules.png` | `/modules` — lock callout + read-only module cards (Health/Jobs = Add-on, dimmed) |
| `04-content.png` | `/content` — compose (EVENT selected, pin off) + feedback inbox |
| `04b-content-pin-on-advisory-cat.png` | pin toggle ON + ADVISORY category active |
| `04c-content-publish-toast.png` | toast "Post published & pushed" (accent check tile) |
| `05-operations-311reports.png` | `/operations` → 311 Reports (active pill = primary) |
| `05b-dialog-start-review.png` | Start review dialog — **amber** (forward transition) |
| `05c-dialog-resolve.png` | Resolve dialog — green |
| `05d-dialog-reject.png` | Reject dialog — red |
| `06-operations-egov.png` | Operations → e-Gov Applications (fees column, ₱ amounts) |
| `06b-dialog-mark-paid.png` | Mark paid dialog — amber |
| `07-operations-assistance.png` | Operations → Assistance (checklist column) |
| `07b-dialog-deny.png` | Deny dialog — red |
| `07c-dialog-approve-claim-fields.png` | Approve dialog — green + Claim date/location fields |
| `07d-toast-status-updated.png` | after confirm — row now APPROVED/closed + toast |
| `08-audit.png` | `/audit` — includes the freshly appended ASSIST event from 07d |
| `09-styleguide.png` | `/style-guide` — runtime palette, chips, buttons, type, phone-frame note |
| `10-branding-studio.png` | `/branding` — swatches, identity, assets, onboarding, live phone preview, version history |
| `10b-branding-studio-scrolled.png` | same, content area scrolled to bottom (sticky preview holds) |
| `10c-branding-swatch-retheme-preview.png` | Sorsogon blue + red selected → phone preview re-themed live (console shell unchanged) |
| `10d-branding-save-toast.png` | after "Save changes" — toast "Saved v7", version history/stat bump to v7 |

Interactions defined but not visually capturable: nav/quick-link/upload-zone/swatch hovers
(values in §4/§5), input focus border-swap. Not present in the prototype at all: login error
state, empty states, pagination, loading skeletons.

---

## 7. DIFFERENCES vs the Platform Console spec

(Platform spec: `docs/designs/extracted-console/CONSOLE_DESIGN_SPEC.md`. The two consoles are
siblings — same neutral tokens, same fonts, same table/chip/dialog/toast/keyframe DNA — so a
shared CSS base is right, with the accent plane swapped.)

**Shared verbatim (reuse the same CSS):**
- Neutral tokens `--bg/--ink/--muted/--line/--surface`, `--mono`, status-chip table,
  scrollbar, base resets.
- Plus Jakarta Sans + JetBrains Mono, the uppercase-kicker signature, field-label pattern.
- Card/table construction (16px radius cards, `#FBFCFD` grid header rows, 10px/800 column
  heads), tinted row-action buttons, terminal "closed" italic.
- Transition dialog anatomy (440px card, status-colored icon tile, note textarea, claim
  fields on Approve) and its status-color rule.
- Toast anatomy and timing; `fadeUp/fadeIn/toastIn` keyframes; shadow ramp for
  neutral surfaces; dialog scrim.
- Topbar metrics (66px, identity cluster, 38px logout button with red hover).

**Distinct in the City Console:**

| Aspect | Platform Console | City Console |
|---|---|---|
| Accent plane | Fixed operator indigo `#5B5BD6/#4646B8/#EEF0FE` | **Runtime tenant colors** `--primary/--primary-dark/--primary-soft` + a real secondary accent `--accent/--accent-deep/--accent-soft` (orange) used for highlights (active-nav bar, toast check, config-version stat, onboarding numbers, LIVE dot, Mayor's-corner label) |
| Sidebar | 236px near-black gradient (`#141821→#1B2130`), gray-blue text, section labels, avatar footer | **238px primary gradient** (`primary-dark→primary`), white-alpha text (`.72/.62/.55`), **3px accent bar on active item**, giant volcano watermark at `.09`, tenant-id mono footer |
| Topbar left | Page title + breadcrumb + ⌘K search | Logo tile + page title only (no search, no breadcrumbs) |
| Role badge | Dark pill `#1B2130`/white | `--primary-soft`/`--primary-dark` |
| Active ops pill / segmented | Near-black `#141821` | **`var(--primary)`** |
| Forward row-action color | Indigo `#5B5BD6` | **`var(--primary)`** |
| Toast bg | `#141821` (neutral ink) + indigo check tile | **`darken(primary,.5)`** (`#0F2F3A`) + **accent** check tile |
| Login backdrop | Indigo glow top-right + indigo grid over near-black | **Primary-derived** radial top-LEFT + **accent** grid lines |
| Stat cards | 3-up, label-first, 28px value, no icon | **4-up, 38px icon tile + decorative corner glow circle, 30px value**, primary/accent values |
| Dashboard | (none — lands on Tenants list) | Greeting page: slogan kicker + "Kumusta, Maria 👋" + activity + quick links |
| Modules | Toggle switches (operator can flip) + indigo info callout | **Read-only tag chips "Included"/"Add-on"**, dimmed disabled cards, **lock callout in primary-soft** |
| Branding | Form fields inside tenant-detail tab; color rows w/ hex | **Branding Studio**: 50px preset swatch buttons w/ check + **live 312×520 phone preview** (draft-state themed) + version mini-list + sticky column |
| Version history | Railed timeline (13px dots, connectors) | Flat mini-rows (9px dots), primary dot for current |
| GOVERNANCE chip | Blue `#E8EEFB/#2A5BD7` | **`--primary-soft`/`--primary`** |
| CONFIG/audit fallback chip | Indigo `#EEF0FE/#5B5BD6` | **`--accent-soft`/`--accent-deep`** |
| Ops grid templates | Per-tab templates | Single `1.3fr 1.3fr 1.3fr .9fr 1.2fr` |
| Nav count badges / presence dot | Yes (indigo badge, green glow dot) | None |
| Page max-width | 1120 everywhere | Varies: 900 (Modules) / 1000 (Audit) / 1120 / 1180 (Branding) |
| Drawer (right sheet) | Provision drawer, 560px, stepper | **No drawers anywhere** |
| Screens the other lacks | Tenants list/detail, Admins, provision drawer, admin-create form | Dashboard, Branding Studio (phone preview), read-only Modules |

**Implementation takeaway:** build one shared stylesheet where the platform console's
`--op/--op-deep/--op-soft` and the city console's `--primary/--primary-dark/--primary-soft`
are the same slot; the city console additionally defines the `--accent*` family and overrides
the sidebar/toast/login recipes per the table above.

---

## 8. Prototype vs the real tenant-admin-panel (deviations to note)

- **Style Guide page** exists in the prototype but not in the real app's page list — treat it
  as a dev-only reference (worth keeping behind a flag; it documents the runtime palette).
- **Color selection** is 3 fixed preset swatches per role (the three seeded tenants' palettes).
  The real Branding Studio needs free color input (hex field + swatch) — reuse the swatch
  button styling for presets and the platform console's color-picker-field pattern for the
  hex input.
- **Upload zones and the executive photo stub are static** — no file-picker, progress, or
  preview states are designed. Same for onboarding-slide editing (pencil icon only).
- **No login error banner**, no loading/skeleton states, no pagination, no empty states, no
  WS/live indicators. The platform console spec §4.24/§5 has an error-banner and skeleton
  recipe if needed — restyle with `--primary`/`#FDECEC` respectively.
- Dialog forward-transitions ("Start review", "Mark paid") intentionally show **amber**
  chrome while their row buttons are **primary** — keep this; the dialog colors by the
  *target status family*, the row button by *action direction*.
- Prototype "saves" only bump a local version counter; the real app must POST a new config
  version and re-hydrate the root CSS vars when the config refreshes (the whole shell then
  re-themes — the prototype only re-themes the phone preview).
