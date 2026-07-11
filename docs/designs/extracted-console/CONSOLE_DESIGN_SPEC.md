# Platform Console — UI/UX Design Specification

Extracted from `docs/designs/PlatformConsole_Standalone.html` (Claude Design desktop prototype, 1440×940 canvas).
All values below are taken verbatim from the prototype's markup and verified via `getComputedStyle` on the rendered DOM.
Written for a React + plain-CSS implementation. Screenshots referenced throughout live in `./screens/`.

> **Scope note:** This prototype contains ONLY the platform-operator console
> (login → Tenants / tenant detail / Admins / Style Guide + provision drawer, dialogs, toasts).
> It does **not** contain a city/tenant-branded console — no "City Console", no view-as-tenant,
> no phone-preview branding studio. Tenant branding appears only as form fields inside the
> operator's tenant-detail Branding tab.

---

## 1. Design tokens (CSS custom properties)

The prototype defines these on the app root — reuse them verbatim:

```css
:root {
  /* Light chrome (main work area) */
  --bg:      #F6F8F6;   /* app/page background — very light warm-green-tinted gray */
  --surface: #FFFFFF;   /* cards, tables, topbar, modals */
  --ink:     #1B2A20;   /* primary text — near-black with green undertone */
  --muted:   #6B7C70;   /* secondary text, captions, table meta — desaturated green-gray */
  --line:    #EAEFEA;   /* hairlines, card borders, dividers, input borders */

  /* Operator accent (indigo/violet family) */
  --op:      #5B5BD6;   /* operator indigo — primary accent */
  --op-deep: #4646B8;   /* deeper indigo — gradient end, text-on-soft */
  --op-soft: #EEF0FE;   /* indigo tint — soft backgrounds, active icon bg, version pill */

  /* Dark sidebar palette */
  --sb:      #141821;   /* sidebar top / darkest ink; also toast bg, dark segmented pill */
  --sb2:     #1B2130;   /* sidebar bottom of gradient; topbar role badge bg */
  --sbline:  #2A3142;   /* sidebar hairlines/borders; avatar block bg */
  --sbtext:  #C4CBDA;   /* sidebar inactive nav text */
  --sbmut:   #7A8399;   /* sidebar section labels / muted text */

  --mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Additional fixed colors used throughout:

| Purpose | Value |
|---|---|
| Success (green) | `#1E8449` |
| Warning (amber) | `#B7791F` |
| Danger (red) | `#C0392B` (chips/buttons) · `#E53935` (tenant "Danger" brand slot) |
| Info (blue) | `#2A5BD7` |
| Table header row bg / input bg | `#FBFCFD` |
| Table row hover bg | `#FAFBFF` (faint indigo-white) |
| Sidebar presence dot | `#3FB27F` with `box-shadow: 0 0 8px #3FB27F` (glow) |
| Toggle track OFF | `#D4DAE0` |
| Disabled icon fg / placeholder text | `#9AA6B2` |
| Module-callout border | `#DEE0FB` on `--op-soft` bg |
| Login error banner | bg `#FDECEC`, border `#F6D3D3`, text `#C0392B` |
| Skeleton shimmer | `linear-gradient(90deg, #EEF1F4 25%, #F6F8FA 50%, #EEF1F4 75%)` |
| Scrollbar thumb | `#cfd6dd`, hover `#b6bfc9`, 10px, radius 8, 3px transparent border w/ `background-clip: content-box` |

### Status chip colors (bg / fg)

| Status | bg | fg |
|---|---|---|
| active, RESOLVED, APPROVED, READY, CLAIMED | `#E6F5EC` | `#1E8449` |
| suspended, REJECTED, DENIED (+ danger button) | `#FDECEC` | `#C0392B` |
| SUBMITTED (neutral) | `#EEF0F2` | `#6B7C70` |
| UNDER_REVIEW, PROCESSING | `#FEF3E0` | `#B7791F` |
| PENDING_PAYMENT | `#E8EEFB` | `#2A5BD7` |

### Category chip colors (audit + post categories, bg / fg)

| Category | bg | fg |
|---|---|---|
| ADVISORY | `#FDECEC` | `#C0392B` |
| EVENT | `#FEF3E0` | `#B7791F` |
| PROGRAM | `#F0EBFB` | `#6D4BC7` |
| GOVERNANCE | `#E8EEFB` | `#2A5BD7` |
| TOURISM | `#E6F5EC` | `#1E8449` |
| JOBS | `#E8F5F0` | `#1B7F6B` |
| CONFIG (audit fallback) | `#EEF0FE` | `#5B5BD6` |

### Tenant brand colors (used for tenant dots/avatars & module progress bars)

| Tenant | primary | accent |
|---|---|---|
| MyDasma (`ph-cavite-dasmarinas`) | `#1E8449` | `#F1C40F` |
| MySorsogon (`ph-sorsogon-sorsogoncity`) | `#1B4F9C` | `#D62839` |
| MyLegazpi (`ph-albay-legazpi`) | `#0E5C74` | `#F26B21` |

Tenant avatar glow = `rgba(primary, .4)` used as `box-shadow: 0 3px 8px <glow>` (30px avatar) or `0 8px 20px <glow>` (56px header avatar).

---

## 2. Typography

- **UI family:** `'Plus Jakarta Sans', system-ui, sans-serif` (embedded weights: 400, 500, 600, 700, 800).
- **Mono family:** `'JetBrains Mono', ui-monospace, monospace` (weights 400, 500, 600) — used for ALL machine identifiers: tenant ids, bundle ids, ticket numbers (`LGZ-000012`), prefixes, timestamps, hex values, emails in tables.
- Base text color `--ink`; secondary `--muted`. No global line-height set (browser `normal`); explicit `line-height: 1.5` only on feedback message bodies, `1.1` on topbar identity.

### Scale (as used)

| Role | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|
| Page title (H1, e.g. "Tenants") | 24px | 800 | −0.4px | |
| Tenant name in detail header | 22px | 800 | −0.4px | |
| Style-guide display sample | 24px | 800 | −0.5px | |
| Drawer/dialog/login title | 18px / 16px | 800 | −0.3px | login card 18px, dialog 16px |
| Topbar page title | 16px | 800 | −0.3px | |
| Stat card value | 28px | 800 | −0.5px | colored per stat |
| Card section title ("Compose post") | 15px | 800 | — | |
| **Kicker/eyebrow** (above H1: "MULTI-TENANT ESTATE") | 10px | 800 | +1.2px | UPPERCASE, color `--op` |
| **Card kicker** ("VERSION HISTORY", "PALETTE") | 10–11px | 800 | +1.0–1.2px | UPPERCASE, color `--muted` |
| **Table column header** | 10px | 800 | +1px | UPPERCASE, `--muted` |
| Sidebar section label ("OPERATIONS") | 9.5px | 800 | +1.4px | UPPERCASE, `--sbmut` |
| Sidebar wordmark sub ("CONSOLE") | 9.5px | 700 | +1.6px | UPPERCASE |
| Nav item | 13.5px | 600 (active: 800) | — | |
| Tab label | 13.5px | 600 (active: 800) | — | |
| Table primary cell (name) | 14px | 700 | — | |
| Body/table cell | 13px | 400–600 | — | |
| Buttons | 13–14.5px | 700 | — | |
| Input text | 13.5–14px | 500–600 | — | |
| Field label | 11px | 600 | — | color `--muted`, 5–7px below-margin |
| Chips | 11–11.5px | 700 | — | |
| Audit cat chip | 10px | 800 | +0.5px | UPPERCASE |
| Caption / helper | 10–12px | 500–600 | — | `--muted` |
| Mono ids in tables | 12.5px | 500–600 | — | `--mono` |
| Mono timestamps | 10.5–12px | 400 | — | `--mono`, `--muted` |

**Uppercase treatment** is a signature: every kicker, column header, and sidebar label is uppercase + 800 weight + wide tracking at tiny (9.5–11px) size.

---

## 3. Layout

Prototype canvas: fixed 1440×940 (`border-radius: 14px; box-shadow: 0 40px 120px rgba(10,14,25,.4)` — canvas framing only, not needed in the real app). In the SPA treat it as a full-viewport desktop layout.

```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │ Topbar (66px, white, 1px --line bottom)  │
│ 236px    ├──────────────────────────────────────────┤
│ fixed    │ Content scroll area                      │
│ dark     │  padding: 28px 30px 40px                 │
│ gradient │  inner wrapper: max-width 1120px,        │
│          │  margin 0 auto                           │
└──────────┴──────────────────────────────────────────┘
```

- **Sidebar:** width 236px, `background: linear-gradient(180deg, #141821, #1B2130)`, `border-right: 1px solid var(--sbline)`. Three zones:
  1. Brand header — `padding: 22px 20px 20px`, `border-bottom: 1px solid var(--sbline)`; 38px logo tile (radius 11, `linear-gradient(135deg, var(--op), var(--op-deep))`, `box-shadow: 0 6px 16px rgba(91,91,214,.4)`) + wordmark ("Civic Platform" 14px/800 white, "CONSOLE" 9.5px/700 ls 1.6 `--sbmut`).
  2. Nav — `padding: 16px 14px`, flex:1; section label "OPERATIONS" (`padding: 6px 12px 10px`).
  3. Footer identity — `padding: 16px`, `border-top: 1px solid var(--sbline)`; inner block `padding: 9px 10px; border-radius: 11px; background: rgba(255,255,255,.03)`; 32px initials tile (radius 9, bg `#2A3142`, fg `--op`, 12px/800); name 12px/700 white + "3 tenants live" 10px `--sbmut`; right: 7px green presence dot `#3FB27F` with glow.
- **Topbar:** height 66px, `--surface` bg, `border-bottom: 1px solid var(--line)`, `padding: 0 30px`, gap 16. Contents: page title (16px/800, ls −0.3) → breadcrumb chevron + crumb (13px; crumb itself 700 `--ink`, chevron+gap `--muted`) → spacer → search field → identity cluster.
- **Content:** scrollable, `padding: 28px 30px 40px`; every page wraps in `max-width: 1120px; margin: 0 auto` with entrance `animation: fadeUp .3s ease`.
- **Page header row:** flex, `align-items: flex-end; justify-content: space-between; margin-bottom: 20px` — left: kicker + H1 (6px apart); right: primary CTA button.
- **Grids:** stat cards `repeat(3, 1fr)` gap 16, margin-bottom 22; module cards `repeat(2, 1fr)` gap 14; overview `1.3fr 1fr` gap 18; branding `1fr 1fr` gap 18; content tab `1.25fr 1fr` gap 18. Stacked cards inside a column: flex column gap 18.

---

## 4. Components

### 4.1 Sidebar nav item
```css
/* base (one per row, 4px bottom margin) */
width: 100%; display: flex; align-items: center; gap: 12px;
padding: 11px 12px; border-radius: 11px; text-align: left;
color: var(--sbtext); font-size: 13.5px; font-weight: 600; transition: .15s;
/* icon: 19×19 stroke icon, stroke-width 2, currentColor */
/* hover (inactive) */ background: rgba(255,255,255,.05);
/* ACTIVE */ background: rgba(91,91,214,.16); color: #fff; font-weight: 800;
/* count badge (Tenants "3") */
background: var(--op); color: #fff; font-size: 10px; font-weight: 800;
padding: 2px 7px; border-radius: 10px;
```
Tenant-detail routes keep the "Tenants" item active.

### 4.2 Topbar search (display-only in prototype)
```css
display: flex; align-items: center; gap: 9px; min-width: 230px;
background: var(--bg); border: 1px solid var(--line); border-radius: 10px;
padding: 7px 12px; color: var(--muted); font-size: 13px;
/* trailing kbd hint */ font-size: 10.5px; font-weight: 700; background: #fff;
border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px;  /* "⌘K" */
```

### 4.3 Topbar identity cluster
Right-aligned text (name 13px/700, email 11px `--muted`) + role badge `background: #1B2130; color: #fff; font-size: 10.5px; font-weight: 700; padding: 5px 11px; border-radius: 20px; letter-spacing: .3px` + logout icon button `38×38; border-radius: 10px; background: var(--bg); border: 1px solid var(--line); color: var(--muted)` (hover: `color: #C0392B; border-color: #F0C9C9`).

### 4.4 Stat card
```css
background: var(--surface); border: 1px solid var(--line);
border-radius: 16px; padding: 18px 20px;
box-shadow: 0 4px 14px rgba(20,30,40,.04);
/* label */ font-size: 11px; color: var(--muted); font-weight: 600;
/* value */ font-size: 28px; font-weight: 800; letter-spacing: -.5px; margin-top: 6px;
/* value color varies: #1E8449 / #5B5BD6 / #B7791F */
```

### 4.5 Data table (tenants, admins, operations)
Not a `<table>` — CSS grid rows inside a card:
- **Card:** `background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(20,30,40,.05);`
- **Header row:** same grid template as body rows, `padding: 13px 22px; border-bottom: 1px solid var(--line); background: #FBFCFD;` cells 10px/800/ls 1px/uppercase/`--muted`.
- **Body row:** `padding: 15–16px 22px; border-bottom: 1px solid var(--line); align-items: center;` clickable tenant rows are full-width `<button>`s, `transition: .12s`, hover `background: #FAFBFF`.
- **Grid templates:** tenants `2fr 1.5fr .8fr 1fr 1.4fr 1fr`; admins `1.8fr 1.2fr 1.2fr .9fr 1.1fr`; operations `1.1fr 1.3fr 1.3fr .9fr 1.2fr`.
- **Cells:** id cell = 30px tenant tile (radius 9, tenant primary bg, white 11px/800 prefix, glow shadow) + mono id 12.5px/500; name 14px/700; meta 13px `--muted`; bundle mono 12px `--muted`.
- **Module progress:** track `height: 6px; border-radius: 4px; background: var(--line); max-width: 70px` + fill `width: N0%; background: tenantPrimary; border-radius: 4px`, followed by "8/10" 12px/700.
- **Status chip (in tables):** `font-size: 11px; font-weight: 700; padding: 4px 10–11px; border-radius: 20px; white-space: nowrap` with chip colors table above.
- **Row actions (operations):** tinted outline buttons `font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 9px; background: rgba(actionColor,.1); color: actionColor; border: 1px solid rgba(actionColor,.25)`; hover `filter: brightness(.97)`. Action color: indigo `#5B5BD6` for forward transitions, green `#1E8449` for terminal-positive, red `#C0392B` for reject/deny. Terminal rows show italic 11.5px `--muted` "closed". Right-aligned, `gap: 7px`.
- **No pagination anywhere in the prototype** (small datasets); no empty states shown.

### 4.6 Buttons
| Variant | Style |
|---|---|
| **Primary** | `background: linear-gradient(135deg, var(--op), var(--op-deep)); color: #fff; font-weight: 700; font-size: 13.5px; padding: 12px 18px; border-radius: 12px; box-shadow: 0 10px 24px rgba(91,91,214,.3);` hover `filter: brightness(1.06–1.07)`. Full-width variants (login "Sign in" 14.5px/`padding:14px`, "Save branding" / "Publish & push" `padding:12–13px; border-radius:11–12px`). Drawer footer variant `padding: 11px 24px; border-radius: 10px; box-shadow: 0 8px 18px rgba(91,91,214,.28)`. |
| **Secondary / Cancel** | `background: var(--bg); border: 1px solid var(--line); color: var(--muted)` (style-guide secondary uses `color: var(--ink)`); `font-size: 13px; font-weight: 700; padding: 10–11px 18–20px; border-radius: 10px`. |
| **Danger (solid soft)** | `background: #FDECEC; color: #C0392B;` same metrics as secondary. |
| **Solid status (dialog confirm)** | solid `#1E8449` / `#B7791F` / `#C0392B` bg (matches transition), white text, `padding: 11px 22px; border-radius: 10px`. |
| **Ghost / text** | plain text button, e.g. back-link "‹ All tenants": `color: var(--muted); font-size: 13px; font-weight: 600; gap: 7px;` hover `color: var(--op)`. |
| **Icon button** | `36–38px square; border-radius: 10px; background: var(--bg); border: 1px solid var(--line); color: var(--muted)`. |
| Leading + icon | 17px stroke icon, `gap: 9px` (e.g. "＋ Provision new tenant", "＋ Create admin"). |

### 4.7 Inputs / selects / labels
```css
/* label above field */
font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 5–7px;
/* login labels are stronger: 12px/700 var(--ink) */

/* text input / textarea */
width: 100%; border: 1.5px solid var(--line); border-radius: 10px; /* login: 11px */
padding: 11px 13px;  /* login: 13px 14px; drawer: 12px 13px; dialog small: 10px 12px */
font-size: 13.5px; font-weight: 500–600; outline: none;
background: #fff;    /* login inputs idle bg: #FBFCFD */
/* FOCUS */ border-color: var(--op);  /* (login also flips bg to #fff) */
/* mono inputs (tenant id, bundle id, prefix) use font-family: var(--mono) */
/* textarea */ height: 76–96px; resize: none;

/* select (display-only) — same box + trailing chevron svg 15px stroke --muted */
```
Focus ring = border-color swap to `--op` only (no outer glow).

### 4.8 Tabs (tenant detail)
```css
/* row */ display: flex; gap: 4px; margin: 18px 0 20px; border-bottom: 1px solid var(--line);
/* tab */ padding: 11px 16px; font-size: 13.5px; margin-bottom: -1px; transition: .12s;
          color: var(--muted); font-weight: 600; border-bottom: 2.5px solid transparent;
/* active */ color: var(--ink); font-weight: 800; border-bottom-color: var(--op);
```
(Note: prototype's inactive tab fg is `#6B7C70`, active fg `#1B2A20`.)

### 4.9 Segmented pill filters (ops sub-tabs, role picker)
Ops sub-tabs ("311 Reports 4" etc.):
```css
display: flex; gap: 8px;  /* row, margin-bottom 16px */
padding: 9px 15px; border-radius: 20px; font-size: 13px; font-weight: 700;
/* inactive */ background: #fff; color: var(--muted); border: 1px solid var(--line);
/* active   */ background: #141821; color: #fff; border-color: #141821;
/* count pill */ font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 10px;
/* inactive: bg #F1F3F5 fg --muted · active: bg rgba(255,255,255,.2) fg #fff */
```
Role picker (Platform/Tenant) uses the same dark-active pattern but squarer: `padding: 10px; border-radius: 9px; font-size: 12px`.
Post category chips: `font-size: 11.5px; font-weight: 700; padding: 6px 12px; border-radius: 18px;` inactive white/`--line` border/`--muted`; active uses that category's chip bg + fg, `border: 1px solid <fg>`.

### 4.10 Toggle switch (module availability)
```css
/* large (module cards) */
track: width 46px; height 27px; border-radius 20px;
       ON background: var(--op); OFF: #D4DAE0; transition .18s;
knob:  21px circle; background #fff; top 3px; left 3px → 22px when ON;
       box-shadow: 0 2px 5px rgba(0,0,0,.25); transition .18s;
/* medium (drawer module list) */ track 42×24 r16; knob 18px; left 3→21px
/* small (pin-to-top) */          track 40×24 r16; knob 18px; left 3→19px; shadow 0 1px 3px rgba(0,0,0,.3)
```

### 4.11 Module card (Modules tab)
```css
background: var(--surface); border-radius: 14px; padding: 16px 18px;
display: flex; align-items: center; gap: 14px; transition: .15s;
border: 1.5px solid;  /* ON: rgba(91,91,214,.35) · OFF: var(--line) */
/* icon tile */ 42px; border-radius: 11px;
   ON: bg #EEF0FE fg #5B5BD6 · OFF: bg #F1F3F5 fg #9AA6B2; 20px stroke icon
/* title 14px/700; desc 11.5px --muted */
```
Info callout above the grid: `background: var(--op-soft); border: 1px solid #DEE0FB; border-radius: 12px; padding: 12px 16px; color: var(--op-deep); font-size: 12.5px; font-weight: 600;` with 17px info icon.

### 4.12 Content cards (generic)
`background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 20–22px; box-shadow: 0 4px 14px rgba(20,30,40,.04);` — heavier tables/audit use `0 8px 24px rgba(20,30,40,.05)`. Card kicker (uppercase 10–11px/800) then 13–18px top margin to content.

### 4.13 Key/value list rows (Identifiers, Geography)
`display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid var(--line)` (last row no border); key 13px `--muted`, value mono 12.5–13px/600 or 700 if numeric.

### 4.14 Version-history timeline (Overview)
```css
/* row */ display: flex; gap: 14px;
/* rail */ dot 13px circle; current: bg var(--op), border 3px rgba(91,91,214,.25);
           past: bg #fff, border 3px #EAEFEA;
           connector: width 2px; background: var(--line); flex 1 (min-height 34px; 0 on last);
/* body (padding-bottom 20px) */
   label 13.5px/700 ("v3 · current"); note 12px --muted; timestamp 11px --muted var(--mono);
```

### 4.15 Integration status rows
Label 13px/600 + right cluster `gap: 6px`: 7px dot (bg = status color) + text 12px/700 in status color (`#1E8449` Connected, `#B7791F` Sandbox). Same dot+text pattern for admin status (Active green / Invited amber).

### 4.16 Branding tab pieces
- **Color-picker field:** `display: flex; gap: 11px; border: 1px solid var(--line); border-radius: 11px; padding: 9px 11px;` 30px swatch (radius 8, `border: 1px solid rgba(0,0,0,.08)`) + label 11px `--muted`/600 + hex mono 12.5px/600. Drawer variant: 26px swatch radius 7 inside a 1.5px-border input box.
- **Upload zone:** `border: 1.5px dashed var(--line); border-radius: 12px; padding: 16px 8px;` centered column gap 8: 38px ghost tile (tenant primary at `opacity: .12`, radius 10), label 11.5px/700, hint 10px `--muted`; hover `border-color: var(--op)`. 3-across grid, gap 12.
- **Onboarding slide row:** `border: 1px solid var(--line); border-radius: 11px; padding: 11px 13px; gap: 12px;` 26px number tile (radius 8, bg `--op-soft`, fg `--op-deep`, 12px/800) + title 13px/700 + body 11px `--muted`.
- **Hero-image stub:** `border: 1.5px dashed var(--line); border-radius: 10px; padding: 8px 14px; font-size: 12px; color: var(--muted); font-weight: 600;`

### 4.17 Tenant detail header
Card (16px radius, 22×24 padding, table shadow) with: 56px tenant tile (radius 15, tenant primary, 18px/800 white prefix, `box-shadow: 0 8px 20px rgba(primary,.4)`) · name 22px/800 + status chip · mono sub-line `id · bundle` 12.5px `--muted` (5px top) · right block: "CONFIG VERSION" kicker + version pill `background: var(--op-soft); color: var(--op-deep); font-weight: 800; font-size: 15px; padding: 6px 14px; border-radius: 11px;` ("v3").

### 4.18 Provision drawer (right sheet, 3 steps)
- **Scrim:** `position: fixed; inset: 0; background: rgba(15,18,28,.5); backdrop-filter: blur(2px);` fadeIn .2s.
- **Panel:** right-anchored, `width: 560px; height: 100%; background: var(--surface); box-shadow: -30px 0 80px rgba(0,0,0,.3);` slide-in `drawerIn .3s ease` (`from { transform: translateX(40px); opacity: .4 }`).
- **Header:** `padding: 22px 26px; border-bottom: 1px solid var(--line);` kicker "ONBOARDING" (`--op`) + title 18px/800 + close icon button 36px.
- **Stepper:** `padding: 18px 26px; gap: 8px; border-bottom: 1px solid var(--line);` per step: bar `height: 5px; border-radius: 3px` (done/current `--op`, upcoming `--line`) + label 11px/700 below 7px (`--op` when reached, else `#9AA6B2`).
- **Body:** scrollable, `padding: 24px 26px`, fields column gap 16, two-col rows `1fr 1fr` gap 14. Step 3 module rows: `border: 1px solid var(--line); border-radius: 11px; padding: 11px 14px;` label 13.5px/600 + medium toggle.
- **Footer:** `padding: 18px 26px; border-top: 1px solid var(--line);` Back (secondary) left, Continue/Provision tenant (primary, radius 10) right.

### 4.19 Transition dialog (status changes, with audit note)
- Same scrim as drawer (`z` above it). Card: `width: 440px; border-radius: 18px; padding: 26px; box-shadow: 0 30px 80px rgba(0,0,0,.4);` fadeUp .25s.
- Header: 42px icon tile `border-radius: 12px; background: rgba(statusColor,.12); color: statusColor` with 21px check icon + title 16px/800 + mono ticket id 12.5px `--muted`.
- Status color: green `#1E8449` (resolve/approve/ready), amber `#B7791F` (under review/processing), red `#C0392B` (reject/deny).
- Body: "Note (attached to audit trail)" label + 76px textarea. Approve adds 2-col claim fields (Claim date / Claim location).
- Footer right-aligned: Cancel (secondary) + solid status-colored confirm.

### 4.20 Toast
```css
position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%);
background: #141821; color: #fff; font-size: 13px; font-weight: 600;
padding: 13px 20px; border-radius: 13px; box-shadow: 0 16px 40px rgba(0,0,0,.35);
display: flex; align-items: center; gap: 11px; white-space: nowrap;
animation: toastIn .3s ease;  /* from: opacity 0, translateY(14px) */
/* leading tile */ 22px; border-radius: 7px; background: var(--op); white 13px check
/* auto-dismiss ~2.2s */
```
Messages: "v14 saved", "Status updated → APPROVED", "Tenant provisioned — v1 created", "Administrator invited", "Post published & pushed".

### 4.21 Audit trail row
`display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--line);` inside a card with `padding: 8px 4px`. Cells: 34px icon tile (radius 9, category chip bg/fg, 17px stroke icon) → category chip (10px/800/ls .5, `padding: 3px 9px; border-radius: 14px`) → title 13.5px/600 (flex 1) → actor 12px `--muted` → timestamp mono 11.5px `--muted`, `min-width: 150px`, right-aligned.

### 4.22 Admin avatar / identity
32px initials tile, `border-radius: 9px; font-weight: 800; font-size: 11px;` tinted bg + colored fg pairs: platform `#EEF0FE`/`#5B5BD6`, per-tenant tint of tenant primary (e.g. `#E6F5EC`/`#1E8449`). Name 13.5px/700 + email 11px `--muted` beneath. Role badge: platform = dark pill (`#141821` bg, white fg), tenant = soft indigo pill (`#EEF0FE` bg, `#5B5BD6` fg); both `11px/700; padding: 4px 11px; border-radius: 20px`.

### 4.23 Feedback inbox card row
`border: 1px solid var(--line); border-radius: 12px; padding: 13px 14px;` name 13px/700 ↔ timestamp mono 10.5px `--muted`; message 12.5px `--muted`, `line-height: 1.5`, 5px top.

### 4.24 Login screen
- **Backdrop (the near-black textured bg):**
  ```css
  background: radial-gradient(1200px 700px at 70% -10%, #1E2436, #12151F 60%, #0C0E15);
  /* grid overlay — separate absolutely-positioned layer at opacity .5: */
  background-image:
    linear-gradient(rgba(91,91,214,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91,91,214,.05) 1px, transparent 1px);
  background-size: 46px 46px;
  ```
  i.e. a top-right indigo-tinted radial glow over near-black, plus a faint 46px indigo blueprint grid.
- **Card:** `width: 404px; background: #fff; border-radius: 20px; padding: 38px 36px 34px; box-shadow: 0 30px 80px rgba(0,0,0,.5);` fadeUp .4s.
- Header: 44px logo tile (radius 13, indigo gradient, `box-shadow: 0 8px 20px rgba(91,91,214,.4)`) + "Civic Platform Console" 18px/800 ls −0.3 + "Operator administration" 12px `--muted`; divider `height: 1px; background: var(--line); margin: 22px 0`.
- Labels 12px/700 `--ink`; inputs 1.5px `--line` border, radius 11, `padding: 13px 14px`, 14px/500, bg `#FBFCFD` (focus: border `--op`, bg `#fff`).
- Error banner (loginError state): `#FDECEC` bg / `#F6D3D3` border / `#C0392B` text, 12.5px/600, `padding: 10px 13px; border-radius: 11px` + 16px alert icon.
- Full-width primary "Sign in" (`margin-top: 22px; padding: 14px; border-radius: 12px; font-size: 14.5px; box-shadow: 0 10px 24px rgba(91,91,214,.34)`).
- Footer caption: "Protected area · authorized operators only" 11.5px `--muted`, centered, 18px top.

### 4.25 Breadcrumb
Topbar only: page title, then `›` chevron (15px stroke, `--muted`) + crumb text 13px/700 `--ink`, gap 9px. In-page back-nav is the ghost "‹ All tenants" link (4.6).

---

## 5. Signature effects

- **Shadows (elevation ramp):**
  - subtle card: `0 4px 14px rgba(20,30,40,.04)`
  - table/prominent card: `0 8px 24px rgba(20,30,40,.05)`
  - primary button: `0 10px 24px rgba(91,91,214,.3)` (indigo-tinted!)
  - logo/brand tiles: `0 6–8px 16–20px rgba(91,91,214,.4)`
  - tenant avatar: `0 3px 8px rgba(tenantPrimary,.4)`
  - modal/login card: `0 30px 80px rgba(0,0,0,.4–.5)`
  - drawer: `-30px 0 80px rgba(0,0,0,.3)` · toast: `0 16px 40px rgba(0,0,0,.35)`
- **Gradients:** primary/accent surfaces always `linear-gradient(135deg, #5B5BD6, #4646B8)`; sidebar `linear-gradient(180deg, #141821, #1B2130)`; login backdrop radial (above).
- **Radii ramp:** page canvas 14 · cards/tables 16 · modal 18 · login card/drawer header context 20 · module card 14 · callout/upload/dialog-icon 12 · inputs 10–11 · nav item/onboarding row/version pill 11 · buttons 10–12 · icon tiles 9–13 · chips/pills 14–20 (fully round) · toast 13.
- **Transitions:** micro `transition: .12s` (tabs, rows), `.15s` (nav, module cards, small knobs), `.18s` (toggles); hovers via `filter: brightness(1.06/.97)` on filled buttons; screen entrances `fadeUp .3s ease` (translateY(10px)→0), tab panes `fadeIn .2s ease`, drawer `drawerIn .3s`, toast `toastIn .3s`.
- **Keyframes:**
  ```css
  @keyframes fadeUp   { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes toastIn  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
  @keyframes drawerIn { from { transform:translateX(40px); opacity:.4 } to { transform:none; opacity:1 } }
  @keyframes shimmer  { 0% { background-position:-360px 0 } 100% { background-position:360px 0 } }
  @keyframes glow     { 0%,100% { box-shadow:0 0 0 0 rgba(91,91,214,0) } 50% { box-shadow:0 0 22px 0 rgba(91,91,214,.35) } }
  ```
- **Skeleton:** `height: 14px; border-radius: 7px;` shimmer gradient (`#EEF1F4/#F6F8FA`), `background-size: 720px 100%; animation: shimmer 1.4s infinite linear;` widths 82/64/92%.
- **Base resets:** `* { box-sizing: border-box }`, buttons inherit font / no border / `cursor: pointer`, inputs inherit font.

---

## 6. Screen inventory (screenshot → route)

| Screenshot (`screens/`) | Route / state |
|---|---|
| `01-login.png` | `/login` (email prefilled; dark textured backdrop) |
| `02-tenants-list.png` | `/tenants` — stats + tenant table + Provision CTA |
| `03a-tenant-mydasma-overview.png` | `/tenants/ph-cavite-dasmarinas` Overview (v13, long timeline) |
| `03a2-tenant-mydasma-overview-scrolled.png` | same, scrolled to bottom of version timeline |
| `03b-tenant-mysorsogon-overview.png` | `/tenants/ph-sorsogon-sorsogoncity` Overview |
| `03c-tenant-mylegazpi-overview.png` | `/tenants/ph-albay-legazpi` Overview |
| `04-tenant-modules.png` | tenant detail → Modules tab (toggle grid + callout) |
| `04b-tenant-modules-health-enabled-toast.png` | Health toggled ON → version bump toast "v15 saved" |
| `05-tenant-branding.png` | tenant detail → Branding tab (palette, identity, uploads, onboarding slides) |
| `06-tenant-operations-311reports.png` | tenant detail → Operations → 311 Reports |
| `06b-dialog-start-review.png` | "Start review" transition dialog (amber, note field) |
| `07-tenant-operations-egov.png` | Operations → e-Gov Applications |
| `07b-tenant-operations-assistance.png` | Operations → Assistance |
| `07c-dialog-approve-with-claim-fields.png` | "Approve" dialog (green, note + claim date/location) |
| `07d-toast-status-updated.png` | after confirm → toast "Status updated → APPROVED" |
| `08-tenant-content.png` | tenant detail → Content tab (compose post + feedback inbox) |
| `09-tenant-audit.png` | tenant detail → Audit tab (event trail) |
| `10-admins.png` | `/admins` — administrators table |
| `10b-admins-create-form.png` | Admins → New administrator inline form (Tenant role) |
| `10c-admins-create-form-platform-role.png` | same form, Platform role selected (tenant select disabled) |
| `11-styleguide.png` | `/style-guide` — palette, chips, type, buttons, skeleton |
| `12-provision-step1-identity.png` | Provision drawer, step 1 (Identity) |
| `12b-provision-step2-configuration.png` | Provision drawer, step 2 (Configuration: colors, slogan, exec, prefix) |
| `12c-provision-step3-modules.png` | Provision drawer, step 3 (Modules toggles) |
| `12d-provision-done-toast.png` | drawer closed → toast "Tenant provisioned — v1 created" |

Interactions not visually capturable but defined in the prototype logic: nav/table-row/upload-zone hovers (values documented above), login error banner (`loginError` state exists but is never triggered — style in §4.24), `glow`/`spin` keyframes (defined, unused).
