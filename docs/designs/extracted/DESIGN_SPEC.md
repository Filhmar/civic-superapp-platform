# Civic Superapp — UI/UX Design Specification

Extracted from the three Claude Design prototypes (`MyDasma_Standalone.html`, `MySorsogon_Standalone.html`, `MyLegazpi_Standalone.html`) by rendering them headless at 430x932 and reading computed styles off the live DOM. All px values are CSS px measured inside the prototype's 390x844 "phone frame" (i.e. they are already device-scale values you can use 1:1 in React Native).

Screenshots: `screens/<tenant>/*.png` (dasma, sorsogon, legazpi — 37-40 each).
Brand marks: `marks/dasma-mark.svg`, `marks/legazpi-mark.svg`, `marks/sorsogon-mark.png` (raster seal).
Raw computed-style dumps: `raw-<tenant>.json`.

The three apps are ONE design system with a tenant theme swap: identical layout, typography, radii, shadows and neutrals; only the brand color family (`--primary*`, `--accent*`, `--mint`), the logo mark, header watermark, photos and copy change per tenant. Each prototype ships an in-app "Design System" screen (More → Design System / Style Guide, see `screens/*/3?-style-guide-*.png`) that confirms the tokens below.

---

## 1. Typography

Font family everywhere: **"Plus Jakarta Sans", system-ui, sans-serif** (single family; weights 400 / 500 / 600 / 700 / 800). No serif or secondary family anywhere.

Scale actually used (measured):

| Role | Size / Weight | Extras |
|---|---|---|
| Display (onboarding titles, "Payment Successful!") | ~26px / 800 | tight leading, letter-spacing ≈ -0.5px |
| Weather temperature | 24px / 800 | letter-spacing -0.5px |
| Greeting name (header) | 17px / 700 | letter-spacing -0.2px, white |
| Screen title (nav header, e.g. "Apply for Service") | 16px / 800 | letter-spacing -0.2px, ink |
| Section title ("Mga Serbisyo", "Mga Anunsyo", "Malapit sa iyo") | 16px / 800 | letter-spacing -0.3px |
| SOS bar title / mayor quote | 15-16px / 800 | white |
| Primary button label | 15px / 700 | white |
| Card / list-row title (hotline name, announcement title, service name) | 14px / 700 | letter-spacing -0.2px, line-height 1.3 |
| Input value | 14px / 600 | ink |
| Search placeholder / body | 14px / 400 | muted |
| Nearby card title | 13px / 700 | letter-spacing -0.2px |
| Small buttons (style-guide "Primary/Accent/Ghost") | 13px / 700 | |
| Section link ("All services", "Balita →") | 12.5px / 600 | primary color |
| Hotline number | 12.5px / 700 | colored per service |
| Greeting small ("Magandang umaga 👋"), SOS bar subtitle, weather sub | 12px / 400-500 | 80-85% white or muted |
| Input label / list-row subtitle / caption | 11.5px / 400-600 | muted |
| Status chip label | 11.5px / 700 | |
| Mayor sub-line ("Hon. … · City Mayor") | 11px / 400 | white 80% |
| Tile label | 10.5px / 600 | letter-spacing -0.1px, ink |
| Category chip on announcement image ("EVENT") | 10.5px / 700 | accent-deep on tinted pill |
| Tab label | 10px / 700 | active = primary, inactive = muted |
| Kicker / eyebrow ("MAYOR'S CORNER", "CLAIM STUB", "PHOTO", "LOCATION") | 10px / 800 | UPPERCASE, letter-spacing 1.2px, accent (on dark) or muted (on light) |
| Slogan chip ("Bagong Legazpi! 🌋") | 10px / 700 | white on white-16% pill |

Style-guide naming: Display/800 · Heading/700 · Body medium/600 · Caption regular (muted).

## 2. Color system per tenant

CSS custom properties (extracted verbatim from the DOM inline vars):

| Token | MyDasma | MySorsogon | MyLegazpi |
|---|---|---|---|
| `--primary` | `#1E8449` (Dasma Green) | `#1B4F9C` (Marian Blue) | `#0E5C74` (Mayon Teal) |
| `--primary-dark` | `#14532D` | `#0F2F66` (Deep Marian) | `#083A4C` (Deep Mayon) |
| `--primary-light` | `#4CAF50` | `#4C86D9` | `#3E8FAB` |
| `--accent` | `#F1C40F` (Butterfly Gold) | `#D62839` (Heart Red) | `#F26B21` (Lava Orange) |
| `--accent-deep` | `#D4A017` | `#A4161A` (Deep Red) | `#C94F10` (Ember) |
| `--mint` (brand tint) | `#E8F5E9` (Mint Tint) | `#E8EFFA` (Ice Blue) | `#E6F2F5` (Mist) |
| `--bg` | `#F6F8F6` | `#F6F8F6` | `#F6F8F6` |
| `--surface` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| `--ink` | `#1B2A20` | `#1B2A20` | `#1B2A20` |
| `--muted` | `#6B7C70` | `#6B7C70` | `#6B7C70` |
| `--line` | `#EAEFEA` | `#EAEFEA` | `#EAEFEA` |
| `--danger` | `#E53935` | `#E53935` | `#E53935` |

Derived usages seen in computed styles:
- Header gradient: `linear-gradient(135deg, var(--primary-dark), var(--primary) 60%, <primary lightened>)` (Legazpi: `#083A4C → #0E5C74 60% → #2E7D96`).
- Mayor card gradient: `linear-gradient(120deg, var(--primary-dark), var(--primary))`.
- SOS red gradient: `linear-gradient(100deg, #C62828, #E53935)`.
- Digital-ID banner gradient: `linear-gradient(120deg, var(--primary), var(--accent-deep))`.
- Weather card gradient: `linear-gradient(120deg, #EAF4FB, #F4FAF6)` + 1px `--line` border.
- Status chip tints: Approved = `--mint` bg + `--primary` text; Pending = `#FDEBDF`-style accent-deep tint bg + `--accent-deep` text; Urgent = `#FDEDEC` + `--danger` text.
- Semantic hotline icon colors: red `#E53935`, police blue `#2274A5`-ish, fire orange, purple, etc. (see hotlines screens).

## 3. Shape & spacing

Radii (exact, from computed styles):
- Phone frame / device: 44px. App screens use edge-to-edge sheets, header sheet has bottom radius 30px (`0 0 30px 30px`).
- Cards (announcement, list rows, weather, mayor, SOS bar): 16-18px (list row 16, announcement 18, mayor 18, SOS bar 18, weather 18).
- QR/claim-stub card: 20px. Digital-ID banner: 22px. Digital-ID card itself: ~22px.
- Buttons: primary CTA 14px; small style-guide buttons 12px; inputs 12px; search bar 14px; module tile 14px (outer) with 16px icon square.
- Chips/pills: fully rounded (20px on status chips, 12px slogan chip, circular avatar 50%).
- Tab bar container: `26px 26px 44px 44px` (rounded top corners, follows device corners at bottom).

Shadows (exact box-shadow values):
- Search bar: `0 8px 20px rgba(0,0,0,0.12)`
- SOS bar: `0 12px 26px rgba(229,57,53,0.34)` (colored glow)
- Primary button: `0 10px 22px rgba(<primary>,0.28)` (colored glow, e.g. `rgba(14,92,116,0.28)`)
- Announcement card: `0 8px 22px rgba(0,0,0,0.07)`
- List row: `0 4px 12px rgba(0,0,0,0.04)` + 1px `--line` border
- Nearby card: `0 6px 16px rgba(0,0,0,0.06)`
- QR stub card: `0 8px 24px rgba(0,0,0,0.07)` + 1px `--line` border
- Tile icon square: `0 4px 10px rgba(0,0,0,0.05)`
- Tab bar: `0 -6px 24px rgba(0,0,0,0.05)` (upward)
- Phone frame: `0 30px 80px rgba(0,0,0,0.35)` (prototype chrome only)

Spacing:
- Screen horizontal padding: **20px** (all content rails are 350px wide in the 390 frame).
- Header padding: `16px 20px 58px` (deep bottom padding; search bar overlaps the header bottom edge).
- Card padding: list row 14px; announcement card content 12px; mayor card `14px 16px`; weather 16px; QR stub 22px; ID banner 20px; SOS bar `15px 18px`.
- Grid gap: module tiles 4 columns, ~91px cells with ~4px gutters (tile inner padding `10px 4px`, gap 7px between icon and label); announcement carousel cards 270px wide with 12-13px gap, horizontal scroll; nearby strip cards 150px wide.
- Inputs: `13px 14px` padding, 46px tall. Primary buttons 48-49px tall, full width (350px).

## 4. Components

### Top header (home)
172px tall sheet, primary gradient (135deg dark→primary→light), bottom radius 30, subtle tenant watermark graphic (Mayon triangle / butterfly / butanding whale-shark silhouette at ~10-15% white). Left: 40px rounded-square (12px) logo badge with the tenant mark. Greeting: "Magandang umaga 👋" 12px/500 white-80 over name 17px/700 white. Right: bell icon in a 40px white-10% rounded square with an accent notification dot, then a 40px circular avatar ("JD") — avatar bg is `--accent`, text `--primary-dark` 15px/800, ring `2px solid rgba(255,255,255,0.5)`.

### Search bar
350x42, white, radius 14, shadow `0 8px 20px rgba(0,0,0,.12)`, padding `12px 14px`, gap 10; leading magnifier icon (muted); placeholder 14px/400 muted ("Maghanap ng serbisyo o lugar…"). It sits half-overlapping the header's bottom edge.

### SOS bar (home)
350x74 red gradient bar (100deg `#C62828→#E53935`), radius 18, red glow shadow, padding `15px 18px`. Left 44px white-15% rounded square with warning triangle icon; title "Emergency SOS" 16px/800 white; sub "City Rescue & 911 · Tap for help" 12px white-85; trailing chevron.

### Mayor's Corner card
350x103, gradient `120deg primary-dark→primary`, radius 18, padding `14px 16px`, gap 14, tenant watermark on right. 64px circular photo with white ring. Kicker "MAYOR'S CORNER" 10px/800 uppercase ls1.2 in `--accent` (Sorsogon uses its red accent). Quote 15px/800 white ("Mabuhay, Legazpeño!"), sub 11px white-80 ("Hon. … · City Mayor"), then slogan chip: white-16% pill, radius 12, `3px 10px`, 10px/700 white ("Bagong Legazpi! 🌋" / "Sulong na! Sulong pa! 🦋" / "Taas-Noo, Ciudadano Ako! 🐋").

### Module tile grid
Section "Mga Serbisyo" + link "All services". 4 columns x 3 rows, 12 modules in fixed order: Gov Services, Report, Assistance, Hotlines, News, Tourism, Transport, Directory, Health, Jobs, Events, Weather. Tile = 91x91 tap target, radius 14, transparent bg, padding `10px 4px`, gap 7. Icon = 52x52 rounded-square (radius 16) in a pastel tint with a 1.5-2px stroke line icon in the matching saturated color; shadow `0 4px 10px rgba(0,0,0,.05)`. Tint families rotate per tile (brand mint, red/blush for Report & Health, peach/gold for Assistance & Events, light blue for Hotlines/Transport/Weather, lavender for Directory) — Report/SOS-adjacent tiles keep red identity in every tenant while several tiles take the tenant tint (e.g. Legazpi mist-teal, Dasma mint-green, Sorsogon ice-blue). Label 10.5px/600 ink below. No disabled tile state appears in any prototype.

### Announcements carousel ("Mga Anunsyo" + "Balita →")
Horizontal scroll of 270px-wide cards, radius 18, white, shadow `0 8px 22px rgba(0,0,0,.07)`. Top: 120px image (real photos in all tenants — festival posters, advisories) with a category pill overlaid bottom-left: tinted pill (peach/blush), 10.5px/700 accent-deep uppercase text ("EVENT", "ADVISORY", "GOVERNANCE", "JOBS"…). Body (12px padding): title 14px/700 lh 1.3 ls-0.2 (2-line clamp), meta 11.5px muted "Jul 4, 2026 · City PIO".

### Weather card
350x79, radius 18, gradient `120deg #EAF4FB→#F4FAF6`, 1px `--line` border, padding 16. Left: orange sun icon; temp 24px/800 ls-0.5 + "Legazpi · Partly Cloudy" 12px/500 muted. Right: "Air Quality" caption + pill "● Good · 42" (mist-blue pill, primary-ish text).

### Nearby strip ("Malapit sa iyo")
Horizontal scroll of 150x136 white cards, radius 16, shadow `0 6px 16px rgba(0,0,0,.06)`. Top ~84px is a diagonal-stripe pastel placeholder (alternating brand-tint and peach), bottom has name 13px/700 ls-0.2 and meta 11.5px muted ("Mall · 1.6 km").

### Digital-ID banner (home footer)
350x152, radius 22, gradient `120deg primary→accent-deep` with tenant watermark; kicker "LEGAZPI DIGITAL ID" white-70 10px/800 ls1.2; title "Kunin ang iyong QR City ID" ~19px/800 white; white pill button "Activate now" (radius ~12, primary text).

### Bottom tab bar
Floating white bar, full width inside frame, 88px tall (incl. home-indicator zone), radius `26px 26px 44px 44px`, shadow `0 -6px 24px rgba(0,0,0,.05)`, padding `10px 16px 0`. Five slots: **Home, Services, [SOS], News, More**. Tabs = icon (22px line icon) + 10px/700 label; active = `--primary` (icon+label), inactive = muted gray. Center SOS = 60px red circle (`--danger`, radial darker edge), white 800-weight "SOS" text, raised ~24px above the bar top edge with a white ring/halo (notch effect) and red glow; it is a global element on every tab.

### Status chips
Pill radius 20, padding `5px 12px`, 11.5px/700. Approved = mint bg / primary text; Pending = peach `#FDEBDF` bg / accent-deep text; Urgent = blush `#FDEDEC` bg / danger text. (Also used as selected-category chip on report form: mist bg + primary text.)

### Buttons
- Primary CTA: full-width 350x48-49, radius 14, bg `--primary`, white 15px/700, colored glow shadow `0 10px 22px rgba(primary,.28)`. (E.g. "Send OTP", "Review Application", "Submit Report", "Pay ₱ 3,240.00", "Done", "Back to Home".)
- Accent button (style guide): bg `--accent`, text `--primary-dark`, radius 12.
- Ghost/secondary: white/transparent bg, 1px `--line` border, radius 12-14, ink 13-15px/700 ("Continue as Guest" is the full-width version, radius 14, 48px).
- Danger ghost: "Log Out" — white bg, 1px danger-tint border, danger text, radius ~14.
- Back button: 40x40 top-left, radius ~14, bg `#F1F4F1` (light gray square), ink chevron. Screen header = back button + 16px/800 title, white sheet with 1px bottom hairline.

### Inputs & forms
Label 11.5px/600 muted above; field 350x46, white, radius 12, 1px `--line` border, padding `13px 14px`, value 14px/600 ink. Select shows placeholder 14px/400 muted + chevron. Textarea same skin, ~96px. Photo-upload dropzone: dashed 1.5px `--line` border, radius 16, camera icon + "Tap to add a photo" muted. Map picker: 250px-high light blue grid with red pin + white address pill (radius 20, 13px/700). Section kickers ("PHOTO", "LOCATION", "DESCRIPTION") 10px/800 uppercase muted. Multi-step flows show a 3-segment progress bar at top (segments 4px tall, radius 2, active = primary, inactive = `--line`).

### List rows (hotlines, directory, notifications, ID meta)
350px wide white card rows, radius 16, 1px `--line` border, shadow `0 4px 12px rgba(0,0,0,.04)`, padding 14, gap 13. Leading 46px rounded-square (radius 14) icon chip in a semantic solid color (red rescue, blue police, orange fire, teal hospital, purple CSWDO) with white icon; title 14px/700, sub 11.5px muted, phone number 12.5px/700 in the semantic color; trailing 44px circular mist call button. Notifications use tinted (not solid) icon squares + unread dot in danger red. Grouped meta list (Digital ID screen): single white card, rows separated by hairlines, label muted left / value 14-15px:700 right.

### Timeline / stepper (report ticket)
Inside a white card with "Ticket No." caption and ticket id 18px/800 primary right-aligned ("LGZ-554487"). Vertical stepper: 14px dots — completed = solid primary with 2px primary line segment below, upcoming = hollow `--line` circle. Step title 14px/700 (upcoming steps muted), sub 12px muted ("Just now · via MyLegazpi", "City Engineering Office"). Steps: Submitted → Under Review → Resolved.

### QR / claim stub card (payment success)
Centered success layout: 72px mist circle with primary check, "Payment Successful!" display 22-24px/800, body muted. Stub: 342px white card radius 20, border `--line`, shadow, padding 22; kicker "CLAIM STUB" 10px/800 ls1.2 muted; 180px checkerboard QR placeholder (radius 12); "Reference No." caption; reference 20px/800 primary monospaced-feel ("LGZ-rpt-7742"); dashed hairline divider; footnote "Window 4 · Ready in 3-5 working days" muted.

### Digital City ID card
350px card, radius ~22, gradient primary-dark→primary with accent-orange bleed at bottom-right corner + tenant watermark. Header row: small circular mark badge + "CITY OF LEGAZPI · e-ID" 11px/800 white ls1. Body: 64px rounded-square avatar (white-ish, initials), name 20px/800 white, "ID No. LGZ-2026-004821" 12.5px white-80, barangay line. Inner white panel radius 16: QR left (120px), right kicker "SCAN TO VERIFY" + "Verified Resident ✓" 15px/700 + "Valid until Dec 2026" muted. Below: grouped meta card (Mobile/Email/Barangay) and danger-ghost Log Out.

### SOS screen
Full-bleed danger red (radial/linear red field), white X close button (top-left, white-15% square). Title "Emergency SOS" 26px/800 white centered, sub 14px white-80 (Filipino instruction). Center: 190px white circle button, red phone icon + "HOLD" 26px/800 danger, with two concentric white-10% halo rings. Footer: "📍 Sharing your live location with responders" 13px white; 4 quick-dial tiles (Rescue/Police/Fire/Medical) — white-14% squares radius 14-16, white icon + 12px/700 label.

### Onboarding & auth
Onboarding: full-bleed tenant photo with brand duotone overlay — slide 1 primary tint, slide 2 accent tint, slide 3 danger/red tint (same photo per tenant; Legazpi = aerial city + Mayon). Floating circular mark (96px) in a glass circle. Bottom white sheet (top radius ~28) with Display/800 title, 15px muted body, page dots (active = 28px primary bar, radius 3) and primary pill "Next"/"Get Started" (radius 14, chevron). "Skip" top-right 13px/600 white.
Login: top hero = primary gradient sheet, bottom radius 40, centered 96px mark + "My**Legazpi**" wordmark 28px/800 (prefix ink/white, city name in accent). White area: "Maligayang pagdating!" display, mobile field with 🇵🇭 +63 prefix and separator hairline (gray filled field radius 14), primary "Send OTP", "or" hairline divider, ghost "Continue as Guest", legal caption with primary links.
OTP: 6 boxed digit cells (46px, radius 12, active border primary) + custom numeric keypad (light gray keys radius 12) + "Verify & Continue" primary CTA.

## 5. Navigation model

- Bottom tabs (order): **Home · Services · [SOS center action] · News · More**. SOS is not a tab — it opens the full-screen SOS overlay from anywhere; the round red button sits centered, elevated half-out of the bar.
- Home tiles deep-link into feature stacks: Gov Services→Services catalog; Report→category grid→form→success+ticket; Assistance→program list→detail; Hotlines/News/Tourism/Transport/Directory/Health/Jobs/Events/Weather→feature screens.
- Sub-screens replace the tab bar with a back-chevron header (40px gray square + 16px/800 title). Some feature screens (Transport, Tourism) use a hero-header variant instead: solid/gradient primary sheet with bottom radius ~30, large white display title ("Public Transport", "Discover Legazpi") + white-80 sub, translucent white back square, with the first content card overlapping the sheet edge.
- Services flow: catalog (grouped: PAY TAXES / PERMITS & LICENSES / CIVIL REGISTRY / BARANGAY & OTHERS, each row shows fee in primary 700) → Apply form (3-segment progress) → Review & Payment (fee lines, Total, payment methods GCash / Debit-Credit card radio cards) → "Pay ₱ …" → Payment Success + QR claim stub.
- Report flow: category grid (2-col cards, selected = mist bg + primary 1.5px border) → Continue → form (photo, map, description) → Submit Report → success + inline 3-step ticket timeline + Done.
- More: profile header (avatar, name, "Rawis · Verified Resident ✓"), rows: Digital City ID, Design System / Style Guide, Notifications (badge 2), Log Out. No standalone settings/help screens exist.
- Header bell → Notifications list. Search bar → inline search screen.

## 6. Tenant identity marks

- **MyDasma** — "Butterfly (Paru-Paró) — transformation & community". Inline SVG (extracted: `marks/dasma-mark.svg`): 4 ellipses forming butterfly wings — top pair green (upper wings, rotated ±22°), bottom pair `var(--accent)` gold (rotated ∓26°), thin dark body line. Wordmark "My**Dasma**" (Dasma in green). Header watermark: giant butterfly silhouette. Avatar/JD chip gold.
- **MySorsogon** — "Official Seal — City of Sorsogon · est. 2000". Raster city seal PNG (extracted: `marks/sorsogon-mark.png`, 207KB) in a white circle. Header/mayor watermark: butanding (whale shark) silhouette. Slogan "Taas-Noo, Ciudadano Ako! 🐋".
- **MyLegazpi** — "Mayon Mark — City of Fun and Adventure". Inline SVG (extracted: `marks/legazpi-mark.svg`): white circle + double ring in Deep Mayon, orange sun circle, teal Mayon volcano triangle with white snow-cap notch, light-blue smoke squiggle, wavy water line. Header watermark: Mayon triangle. Slogan chip "Bagong Legazpi! 🌋".

## 7. Prototype content quirks worth knowing

- User persona everywhere: Juan (M.) Dela Cruz, +63 917 555 0142, barangays: Salitran IV (Dasma), Bibincahan (Sorsogon), Rawis (Legazpi).
- Ticket / reference prefixes per tenant: Dasma `DSM-` (notification "Report DSM-482910"), Sorsogon `SOR-` (payment ref "SOR-rpt-7742"), Legazpi `LGZ-` (report ticket `LGZ-554487`, payment ref `LGZ-rpt-7742`, city ID `LGZ-2026-004821`). Note: the Legazpi build's notification list still says "advisory for Salitran" (Dasma barangay) — leftover copy.
- Service fees are identical across tenants (RPT ₱3,240, Business Tax ₱5,800, Cedula ₱55, EBOSS ₱2,150, Building ₱4,600, Sanitary ₱350, certificates ₱155, Barangay Clearance ₱50, Police Clearance ₱120) — only news/tourism/hotlines/mayor copy is tenant-specific.
- Review screen shows a "Convenience fee ₱20.00" line but the Total equals the processing fee only (prototype bug — decide intended behavior).
