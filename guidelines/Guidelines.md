# Count Me In: System Guidelines

Read this file first on every generation. For product scope, screens, flows, activity presets and mock data, read `guidelines/app-spec.md` before building any screen.

## General guidelines

- Build a mobile-first prototype (390 x 844 viewport) in React with Tailwind. Center the app frame on desktop.
- Dark mode only for this prototype. Do not build a light theme.
- Use the design tokens below as CSS variables in the global stylesheet. Never hard-code hex values in components; always use tokens.
- Reuse components. Build each component once in `components/` and reuse it everywhere. Do not create one-off variants.
- Keep files small and focused: one component per file, one screen per file in `screens/`.
- Use mock data from `data/` (see app-spec.md). No real backend, no real auth, no real camera or SMS. Simulate these with realistic UI states.
- All UI copy is in Australian English. Sentence case everywhere ("Create activity", not "Create Activity"). No exclamation marks in system copy. Tone: friendly, direct, a mate talking, never childish or cheesy.
- Do not add features, screens or settings that are not in app-spec.md.
- Do not mention mental health anywhere in the UI, except on the About page (see app-spec.md).
- Icons: `lucide-react`, stroke width 1.75, size 20px (inline) or 24px (navigation, sport tiles).
- No emoji in the UI.
- Images: use realistic outdoor photography (ocean, reef, trails, coastline, men being active). Never use cartoons or illustrations.

## Design direction

Name: "Deep Sea". Masculine, grounded, calm and adult. Dark navy surfaces, warm sand text, a seafoam secondary colour and one signal orange for the main action. Think coastal South Australia at first light, not a gaming app.

Rules of thumb:
- One orange (accent) action per screen. Everything else is secondary or ghost.
- Hierarchy comes from surface tone, not from shadows.
- Generous spacing, strong condensed headings, quiet body text.

## Colour tokens

Use semantic tokens first. Raw palette values are only a fallback when no semantic token fits.

```css
:root {
  /* Surfaces (darkest to lightest) */
  --bg: #0A1621;              /* app background */
  --surface-1: #132433;       /* cards, list rows */
  --surface-2: #1A2E3E;       /* inputs, raised elements, bottom sheets */
  --surface-3: #1F3A4E;       /* chips, selected states, hover */
  --border: #22384A;          /* default 1px hairline */
  --border-strong: #2E4B62;   /* focused inputs, emphasised dividers */

  /* Text */
  --text-primary: #E6E2D8;    /* warm sand, main text and headings */
  --text-secondary: #9FB3C2;  /* supporting text, metadata */
  --text-muted: #6E8597;      /* placeholders, captions, disabled */

  /* Accent: signal orange, primary action only */
  --accent: #FF6B2C;
  --accent-hover: #FF8250;
  --accent-pressed: #E55A1F;
  --on-accent: #1A0D05;       /* text and icons on orange */
  --accent-subtle: #3A2218;   /* orange tint background */

  /* Secondary: seafoam, dates, status, highlights, verified */
  --seafoam: #7FB7A8;
  --seafoam-subtle: #163430;  /* seafoam tint background */
  --on-seafoam: #0A1621;

  /* Status */
  --success: #5FC48E;
  --warning: #F2B84B;
  --danger: #F0645A;
  --danger-subtle: #3A1C1C;

  /* Overlay */
  --scrim: rgba(5, 11, 17, 0.72);
}
```

Usage:
| Need | Token |
| --- | --- |
| Page background | `--bg` |
| Card or list row | `--surface-1` |
| Input, bottom sheet, raised card | `--surface-2` |
| Chip, selected tile, hover | `--surface-3` |
| Main text, headings | `--text-primary` |
| Metadata, labels | `--text-secondary` |
| Placeholder, caption | `--text-muted` |
| Primary button, active tab icon, key number | `--accent` |
| Date and time, verified tick, "spots left", positive status | `--seafoam` |
| Errors, destructive actions | `--danger` |

Never put `--text-secondary` on `--accent`. On orange always use `--on-accent`.

## Typography

Fonts (Google Fonts):
- Headings, numbers, buttons, labels: **Barlow Condensed** (500, 700)
- Body and UI text: **Barlow** (400, 500)

```css
:root {
  --font-display: "Barlow Condensed", sans-serif;
  --font-body: "Barlow", sans-serif;
}
```

| Style | Font | Weight | Size / line height | Use |
| --- | --- | --- | --- | --- |
| display | Barlow Condensed | 700 | 40 / 44 | Onboarding titles, big stats |
| h1 | Barlow Condensed | 700 | 32 / 36 | Screen titles |
| h2 | Barlow Condensed | 700 | 24 / 28 | Section titles, card titles in detail view |
| h3 | Barlow Condensed | 700 | 20 / 24 | Card titles in feed |
| label | Barlow Condensed | 500 | 14 / 16, uppercase, letter-spacing 0.06em | Section labels, overlines |
| body | Barlow | 400 | 16 / 24 | Default text |
| body-strong | Barlow | 500 | 16 / 24 | Emphasis, names |
| small | Barlow | 400 | 14 / 20 | Metadata, helper text |
| caption | Barlow | 400 | 12 / 16 | Timestamps, fine print |
| button | Barlow Condensed | 700 | 18 / 20 | Button labels |

Numbers (distance, depth, spots, stats) use Barlow Condensed 700.

## Spacing, radius, elevation

- Spacing scale (4pt grid): 4, 8, 12, 16, 20, 24, 32, 40, 48.
- Screen side padding: 20px. Gap between cards: 12px. Section gap: 32px.
- Radius: `--radius-sm: 6px` (chips, small badges), `--radius-md: 8px` (buttons, inputs), `--radius-lg: 12px` (cards, tiles), `--radius-xl: 16px` (bottom sheets, top corners only). Avatars are circles. Nothing else is fully round.
- Elevation: no drop shadows on cards. Bottom sheets and toasts only: `0 -8px 24px rgba(0,0,0,0.35)`.
- Minimum touch target: 44 x 44px.

## Components

Build these once and reuse them. Each lists its variants and states.

**Button**
- Variants: `primary` (bg `--accent`, text `--on-accent`), `secondary` (bg `--surface-3`, text `--text-primary`), `ghost` (transparent, text `--text-primary`), `destructive` (bg `--danger-subtle`, text `--danger`).
- Sizes: `lg` 52px height (full width CTAs), `md` 44px, `sm` 36px.
- States: default, pressed (scale 0.98, darker), loading (spinner, label hidden), disabled (opacity 0.4, only when truly needed).
- Radius `--radius-md`. Label in button style. Optional leading icon.
- The primary join button label is always "Count me in".

**Input / Textarea / Select**
- Height 52px, bg `--surface-2`, 1px `--border`, radius `--radius-md`, padding 16px.
- Label above in `small` `--text-secondary`. Helper text below in `caption`.
- Focus: border `--border-strong` plus 2px outline `--seafoam` at 40% opacity. Error: border `--danger`, helper text `--danger`.

**Chip**
- Height 36px, radius `--radius-sm`, bg `--surface-3`, text `small` 500.
- Selected: bg `--seafoam`, text `--on-seafoam`, check icon.
- Used for sport filters, availability, levels, multi-select options.

**SportTile**
- Square tile in a 3-column grid, bg `--surface-1`, radius `--radius-lg`, 24px lucide icon, sport name in `label`.
- Selected: 2px border `--seafoam`, bg `--seafoam-subtle`, small check in the top right.

**LevelPill**
- Small pill (radius `--radius-sm`, 24px height) showing Beginner / Intermediate / Experienced.
- Beginner: bg `--surface-3`. Intermediate: bg `--seafoam-subtle`, text `--seafoam`. Experienced: bg `--accent-subtle`, text `--accent`.

**ActivityCard** (most important component)
- bg `--surface-1`, radius `--radius-lg`, padding 16px.
- Top row: sport icon + sport name (`label`, `--text-secondary`) on the left, date and time (`small`, `--seafoam`) on the right.
- Title in `h3` (for example "Spearfishing at Port Noarlunga reef").
- Two or three key preset facts as a row of small text with dot separators (for example "5 to 10 m · 2 hrs · Shore dive").
- Meeting point with a map-pin icon in `small` `--text-secondary`.
- Bottom row: host Avatar (32px) + first name + verified tick, SpotsIndicator, and LevelPill. In the feed the whole card is tappable; the "Count me in" button only appears on the detail screen.

**SpotsIndicator**
- Row of small dots (8px): filled `--seafoam` for taken, outline `--border-strong` for open. Text after it: "2 of 4 spots" or "1 buddy wanted".

**Avatar**
- Circle, sizes 32 / 48 / 96px. Optional verified badge: small seafoam circle with a check, bottom right.

**AchievementPatch**
- Badge shaped like a rounded shield or embroidered patch (not a trophy or star). bg `--surface-2`, 1.5px border `--seafoam` when earned, `--border` and greyed icon when locked. Name in `label` below.

**StatChart (lollipop)**
- Monthly meetups as vertical thin lines (2px, `--border-strong`) topped with circles (8px, `--seafoam`). Current month: larger circle (14px, `--accent`) with the value above it in Barlow Condensed 700. Month labels in `caption`.

**ProgressSteps**
- Thin segmented bar at the top of multi-step flows. Done and current segments `--accent`, upcoming `--surface-3`. Step count "Step 2 of 5" in `caption`.

**TopBar**
- 56px. Back chevron on the left (ghost icon button), title in `h3` centered or left, optional action on the right.

**BottomNav**
- 5 items: Home, My activities, Create (center, orange square button 48px with plus icon, radius `--radius-md`), Chats, Profile.
- bg `--surface-1`, top border `--border`. Active icon and label `--text-primary`, inactive `--text-muted`. Unread dot `--accent`.

**BottomSheet**
- bg `--surface-2`, top radius `--radius-xl`, drag handle, scrim `--scrim`.

**ChatBubble**
- Mine: bg `--accent-subtle`, text `--text-primary`, right aligned. Theirs: bg `--surface-2`, left aligned with avatar. System messages (for example "Matt joined the activity") centered in `caption` `--text-muted`.

**QRCard**
- Large white rounded square (radius `--radius-lg`) with the QR code in `--bg`, user name and activity below. "Scan their code" secondary button underneath.

**Toast**
- bg `--surface-3`, radius `--radius-md`, icon + one line of text. Success icon `--success`.

**EmptyState**
- 24px icon in `--text-muted`, title in `h3`, one line of body, one button. Written as an invitation, never an apology.

## Motion

- Default transition 200ms ease-out. Bottom sheets slide up 250ms.
- Button press scale 0.98. No bouncy or playful animations.
