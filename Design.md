---
name: CodeSol Business Automation
product: CodeSol Business Automation
platform: app.codesoltech.com
colors:
  # Light theme — source: frontend/app/globals.css (:root)
  background: '#fafbfc'
  background-oklch: 'oklch(0.988 0.002 260)'
  foreground: '#0d1014'
  foreground-oklch: 'oklch(0.17 0.01 260)'
  card: '#ffffff'
  card-oklch: 'oklch(1 0 0)'
  primary: '#2a5397'
  primary-oklch: 'oklch(0.45 0.12 260)'
  primary-foreground: '#fcfcfc'
  secondary: '#f2f3f6'
  secondary-oklch: 'oklch(0.965 0.004 260)'
  secondary-foreground: '#1d2229'
  muted: '#f2f3f6'
  muted-foreground: '#595e66'
  accent: '#edf0f6'
  accent-foreground: '#1a1f27'
  destructive: '#cc272e'
  destructive-oklch: 'oklch(0.55 0.2 25)'
  warning: '#d79628'
  warning-oklch: 'oklch(0.72 0.14 75)'
  success: '#00884b'
  success-oklch: 'oklch(0.55 0.14 155)'
  info: '#3275b4'
  info-oklch: 'oklch(0.55 0.12 250)'
  border: '#dfe1e5'
  border-oklch: 'oklch(0.91 0.006 260)'
  ring: '#4e72ac'
  ring-oklch: 'oklch(0.55 0.1 260)'
  surface-1: '#ffffff'
  surface-2: '#fbfcfd'
  surface-3: '#f5f7f9'
  sidebar: '#f8f9fb'
  sidebar-primary: '#2a5397'
  sidebar-foreground: '#4a5059'
  chart-1: '#4e72ac'
  chart-2: '#595e66'
  chart-3: '#3d4249'
  chart-4: '#2a2e33'
  chart-5: '#1a1d21'
  # Dark theme — source: frontend/app/globals.css (.dark)
  dark-background: '#05070c'
  dark-foreground: '#e6e8eb'
  dark-card: '#0c1015'
  dark-primary: '#5a86ce'
  dark-sidebar: '#030509'
typography:
  font-sans: Geist
  font-mono: Geist Mono
  body-default:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: normal
  page-title:
    fontFamily: Geist
    fontSize: 20px
    fontSize-sm: 24px
    fontWeight: '600'
    letterSpacing: tight
  section-title:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    letterSpacing: tight
  subsection-title:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '600'
  body:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: relaxed
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: normal
    color: muted-foreground
  label:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
rounded:
  base: 0.375rem
  sm: calc(var(--radius) * 0.75)
  md: var(--radius)
  lg: calc(var(--radius) * 1.25)
  xl: calc(var(--radius) * 1.5)
  2xl: calc(var(--radius) * 2)
  full: 9999px
spacing:
  page-padding-x: 1rem
  page-padding-x-md: 1.5rem
  page-padding-y: 1.25rem
  page-padding-y-md: 1.5rem
  section-gap: 1.5rem
  page-stack-gap: 1rem
  stack-gap: 0.75rem
  control-height: 2.25rem
  control-height-sm: 2.25rem
  table-row-height: 2.375rem
  table-row-height-compact: 2rem
shadows:
  elevation-xs: '0 1px 2px oklch(0.15 0.02 260 / 4%)'
  elevation-sm: '0 1px 3px oklch(0.15 0.02 260 / 6%), 0 1px 2px oklch(0.15 0.02 260 / 4%)'
  elevation-md: '0 4px 6px -1px oklch(0.15 0.02 260 / 6%), 0 2px 4px -2px oklch(0.15 0.02 260 / 4%)'
  elevation-lg: '0 10px 15px -3px oklch(0.15 0.02 260 / 8%), 0 4px 6px -4px oklch(0.15 0.02 260 / 4%)'
---

## Brand & Style

CodeSol Business Automation is a professional SaaS platform for running and automating business operations — CRM, scheduling, finance, communications, and platform administration. The visual identity is **premium, calm, and data-forward**: a cool grayscale foundation with a single restrained accent (hue 260) so dense dashboards and forms stay readable without visual noise.

The design style is **Corporate / Modern** with a **desktop-first app shell** (collapsible sidebar, page headers, data tables, and toolbars). Public surfaces — booking, invoices, estimates, chat widgets — reuse the same token system for brand consistency. Light and dark themes are both first-class.

Brand personality: **trustworthy, efficient, and precise**. The UI favors clarity over decoration — tight typographic hierarchy, subtle elevation, and semantic color only where it carries meaning (status, warnings, destructive actions).

## Colors

The palette follows a **premium grayscale + single cool accent** model defined in `frontend/app/globals.css`. Tokens use OKLCH in code; hex values above are approximate references.

- **Primary (Cool Blue):** `sidebar-primary` / `primary` — main actions, links, sidebar brand mark, focus rings. Light: `#2a5397`; dark: `#5a86ce`.
- **Foreground / Muted:** Deep cool gray text on near-white surfaces. Body copy uses `foreground`; supporting text uses `muted-foreground`.
- **Surfaces:** Layered whites and cool grays (`surface-1` → `surface-3`, `card`, `sidebar`) instead of heavy shadows.
- **Semantic:**
  - **Success** — completed states, positive outcomes (`success`)
  - **Warning** — in-progress, attention needed (`warning`)
  - **Info** — informational / active pipeline states (`info`)
  - **Destructive** — errors, cancellations, irreversible actions (`destructive`)
- **Charts:** Five-step grayscale-to-accent scale (`chart-1` … `chart-5`) for analytics consistency.

Dark mode inverts the surface stack while preserving the same accent hue and semantic meanings.

## Typography

The frontend uses **Geist Sans** for UI text and **Geist Mono** for code and tabular data (`frontend/app/layout.tsx`).

| Role | Class / element | Size | Weight |
|------|-----------------|------|--------|
| Page title | `.text-page-title` / `h1` | 20px → 24px (sm+) | Semibold, tight tracking |
| Section title | `.text-section-title` / `h2` | 16px | Semibold, tight tracking |
| Subsection | `.text-subsection-title` / `h3` | 14px | Semibold |
| Body | `.text-body` / default `body` | 14px | Regular, relaxed leading |
| Caption | `.text-caption` | 12px | Regular, muted color |
| Label | `.text-label` / `Label` | 12px | Medium |

Base body is `text-sm` (14px) with antialiased rendering and OpenType features (`rlig`, `calt`). Financial and numeric data often use `tabular-nums` for aligned columns.

## Layout & Spacing

The app uses a **sidebar + main content** shell (`AppShell`) with responsive page padding.

- **Page padding:** `16px` horizontal / `20px` vertical on mobile; `24px` on `md+` (`--page-padding-x`, `--page-padding-y`).
- **Vertical rhythm:** `16px` between header, toolbar, and content (`--page-stack-gap`); `24px` between major sections (`--section-gap`); `12px` within stacks (`--stack-gap`).
- **Control height:** `36px` (`--control-height`) — shared by buttons, inputs, and toolbar filters for alignment.
- **Tables:** Default row height `38px`; compact `32px`.

Page structure: `PageHeader` (title, description, optional filters/actions) → main content (cards, tables, forms). List pages compose `ListPage` + `DataToolbar` patterns.

## Elevation & Depth

Depth is conveyed through **subtle shadows and hairline rings**, not heavy drop shadows.

- **Cards / elevated surfaces:** `shadow-elevation-xs` + `ring-1 ring-border/70` (`.surface-elevated` utility).
- **Borders:** `border` token (`#dfe1e5` light) for dividers, inputs, and table chrome.
- **Focus:** `3px` ring at 40% opacity of `ring` color (`focus-visible:ring-[3px] focus-visible:ring-ring/40`) — used on buttons, inputs, and interactive controls.
- **Shadow scale:** `elevation-xs` → `elevation-lg` for popovers, dialogs, and overlays.

Pressed/hover states use opacity shifts on the base color (`hover:bg-primary/90`, `hover:bg-muted/80`) rather than inset shadows.

## Shapes

Corner radius is token-driven from a **6px base** (`--radius: 0.375rem`).

- **Controls (buttons, inputs):** `rounded-md` (6px base).
- **Cards, dialogs:** `rounded-lg` (~7.5px).
- **Badges:** `rounded-sm` (smaller multiplier).
- **Brand icon in sidebar:** `rounded-md` on a `sidebar-primary` square.
- **Pills / avatars:** `rounded-full` where needed.

Sharp 90° corners are avoided on interactive elements; radius stays consistent via CSS variables so theme changes propagate automatically.

## Components

Patterns mirror `frontend/components/ui/*` (shadcn + Base UI).

### Buttons

Variants: `default`, `outline`, `secondary`, `ghost`, `soft`, `destructive`, `link`.

- **Default (primary):** `bg-primary text-primary-foreground shadow-elevation-xs`, hover `primary/90`.
- **Outline:** Border + background, hover `muted/80`.
- **Secondary:** `bg-secondary text-secondary-foreground`.
- **Ghost / Soft:** Low-emphasis actions on dense toolbars.
- **Destructive:** Tinted `destructive/10` background with `destructive` text — not a solid red block.
- **Sizes:** `xs`, `sm`, `default` (36px), `lg` (40px), plus icon-only variants.

### Cards

- `rounded-lg bg-card` with optional `shadow-elevation-xs ring-1 ring-border/70`.
- Header/content padding: `20px` default (`16px` on `size="sm"`).
- Footer: top border, `bg-muted/30`.

### Input Fields

- Height `var(--control-height)` (36px), `rounded-md`, `border-input`.
- Focus: `border-ring` + `ring-[3px] ring-ring/40`.
- Invalid: `border-destructive` + destructive ring tint.
- Labels: `text-xs font-medium` above or beside fields.

### Status Badges

Domain-aware `StatusBadge` with tone mapping:

| Tone | Use |
|------|-----|
| `neutral` | Draft, archived, inactive |
| `info` | Scheduled, open, in pipeline |
| `success` | Completed, paid, won |
| `warning` | In progress, pending |
| `danger` | Cancelled, overdue, failed |

Visual: `10%` tint background + matching ring and optional dot (e.g. `bg-emerald-500/10 text-emerald-800` for success).

### Badges (generic)

Compact `h-5` pills for counts and tags. Variants: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.

### Sidebar & Navigation

- Collapsible icon mode on desktop; sheet on mobile.
- Brand block: `sidebar-primary` icon tile + title/subtitle (`14px` semibold title, `12px` muted subtitle).
- Active item: `sidebar-accent` background; sections grouped with labels.
- Settings mode: back link + focused settings nav.

### Data Tables

- Compact typography (`text-xs` headers, `text-sm` cells).
- Column headers: muted, `font-medium`.
- Row actions via icon buttons or row menus; status via `StatusBadge`.

### Page Header & Toolbar

- Title + optional caption (`max-w-2xl` description).
- Actions right-aligned; filters in `DataToolbar` when present.
- Responsive: title/actions stack on small screens, row layout on `sm+`.

## Theming

- **Light:** Near-white cool background, white cards, deep gray text.
- **Dark:** Elevated dark surfaces (`background` → `card` → `popover`), lighter foreground, brighter primary accent.
- Theme toggled via `.dark` class on the document root (system preference supported through app providers).

## Iconography

**Lucide React** icons throughout navigation, actions, and empty states. Icons in buttons default to `16px` (`size-4`); sidebar nav uses `16px` icons in `36px` row height.

## Public & Embed Surfaces

Booking (`/book`), invoices (`/invoice`), estimates (`/estimate`), payments (`/pay`), chat (`/chat`), and pricing embeds inherit the same CSS variables. Plan-group and chatbot appearance settings can override accent colors while staying within the token structure.
