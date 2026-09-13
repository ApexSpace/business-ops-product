# Phase 1 — Text color / typography-color-role audit

**Product:** PandaCue (`ApexSpace/business-ops-product`)  
**Scope:** Design audit only. No runtime / application code changed in this PR.  
**Figma:** [PandaCue](https://www.figma.com/design/5U7QqsKGCOyjDFt8JtrPpb/PandaCue?node-id=0-1) (`5U7QqsKGCOyjDFt8JtrPpb`)  
**Code base:** `development` @ audit start  
**Compared against:** Page 1 **application** screens only. Marketing frames were ignored.

Pixel-perfect Figma recreation is **not** required. Findings flag (1) hierarchy/intent mismatch vs Figma app screens, (2) hardcoded hex/rgb/oklch that bypasses tokens, or (3) the wrong existing semantic token.

---

## 1. Summary

### What’s healthy

- **Semantic theme exists and is wired.** `frontend/app/globals.css` + `frontend/lib/theme/codesol-default-theme.css` own visual values. Recipes in `frontend/lib/design/*` generally compose those variables instead of inventing a second palette.
- **Figma primitive palettes are encoded.** Violet-Primary (`#7e3bed` / `#6b2bd6` / `#5f2cb2` / `#2c1553`), Grey-Tertiary (`#6b6b6b` and scale), Black-Secondary (`#000000`), Green-Success (`#1c9a5b`) match Figma primitives used on Page 1 app screens.
- **On-brand chrome is aligned.** Business shell uses `DashboardNavbar` with `--cs-shell-navbar-foreground: #ffffff` on `--cs-shell-navbar-surface: #6a2bd6`. Navbar tabs, action icons, and user cluster recipes in `navbar-action-tokens.ts` use that on-brand white.
- **Shared list/settings recipes already use heading-violet intent.** Table headers (`text-violet-primary-dark` / primary/800), settings titles/descriptions, drawer titles (`text-violet-primary-normal` / primary/500), and inbox “Conversation” heading use brand violet rather than raw hex.
- **Auth shell uses semantic classes.** `auth-tokens.ts` is `text-foreground` / `placeholder:text-muted-foreground` / hover `text-violet-primary-normal`. No Figma auth frames exist on Page 1 (see skipped).
- **No P0 unreadable contrast** was found on the sampled core flows (calendar, sales, contacts, inbox, settings, auth). Body text on white is dark enough; navbar white-on-violet is sufficient.

### What’s risky

- **Three parallel ink systems** still coexist:
  1. Semantic: `--foreground` / `--muted-foreground` / `--foreground-subtle`
  2. Drawer Figma neutrals: `--drawer-text-primary` `#1a1a1a`, `--drawer-text-secondary` `#8a8a8a`, `--drawer-text-body` `#4a4a4a`, `--drawer-text-label` `#524346`, `--drawer-text-meta` `#6b6b6b`
  3. Leftover CodeSol navy/slate hex: `#12172b`, `#5b6478`, `#98a1b5` on dashboard cards and the unused sidebar shell
- **`--foreground-subtle` is defined but almost unused.** Placeholders and tertiary copy collapse onto `text-muted-foreground` (`#6b6b6b`), which is stronger than Figma placeholder / caption ink (`~#8a8a8a`–`#9a9a9a`, SDS secondary `#757575`).
- **Heading / entity-name role is purple in Figma, black in `--foreground`.** App screens paint staff names, client names, settings titles, and many headings in primary/800–900 violet. Semantic `text-foreground` is `#000`. Recipes that remember this (tables, settings, drawers) look right; pages that hardcode `#4A4A4A` or use `text-foreground` for those names look too grey or too black.
- **Feature files re-paste Figma hex** (`#8A8A8A`, `#524346`, `#1A1A1A`, `#4A4A4A`, `#7E3BED`, `#9A9A9A`) instead of `--drawer-*` / `text-violet-primary-*` / semantic classes. Worst in sales/checkout, gift cards, appointments drawers, contacts list.
- **Default Tailwind palettes** (`text-emerald-*`, `text-red-600`, `text-amber-*`) bypass `--success` / `--destructive` / `--warning`.

### Counts

| Severity | Count | IDs |
|---|---|---|
| P0 | **0** | — |
| P1 | **10** | TXT-01 … TXT-10 |
| P2 | **8** | TXT-11 … TXT-18 |

---

## Figma sources used

Compared visually and/or via variable dumps (Page 1 product UI unless noted):

| Frame / section | Node | Why |
|---|---|---|
| Calendar-day | `176:3238` | Shell navbar, staff names, time-gutter, occupancy pills |
| Calendar-week | `925:9984` | Same calendar roles (structure) |
| Calendar- with appointment cards | `187:6166` | Appointment card type |
| Calendar-New Appointment- for Input | `841:9149` | Drawer field / placeholder roles (screenshot rate-limited; variables + sibling screens) |
| Sales | `191:6598` | Table header/body/status/pagination |
| Transactions | `948:11790` | Adjacent sales list |
| Clients | `976:10020` | Name vs email/phone hierarchy |
| Inbox-reply | `1203:11046` | List, thread, composer, details, danger link |
| Inbox-Note | `1324:18727` | Composer variant |
| Conversations | `1124:16159` | List column |
| Setting- (Business Details) | `1295:11403` | Settings title, description, labels, placeholders, nav idle/active |
| Settings section (desktop workspace) | `1446:22905` | Settings IA (structure) |
| Sliding Panel Container-New Checkout | `948:12213` | Checkout drawer (rate-limited after first screens; variables from Sales + code recipes) |
| **Supplementary (not Page 1 screens, used only for named styles/palettes):** Typography | `45:117` on page `Components and Design system` (`2:632`) | `Text Color/text-primary-black` `#131927`; type scale (size/weight only) |
| Violet / Grey / Black / Green palettes | `27:14`, `27:157`, `27:280`, `52:290` | Primitive ramps |
| Color (Page 1 swatches) | `492:2518` | Primary/500–900 `#7e3bed`…`#2e1260` |

Variables observed on app screens (not marketing):

| Figma variable / style | Hex | Role on app screens |
|---|---|---|
| `Text Color/text-primary-black` | `#131927` | Spec sheet primary ink (DS page) |
| `var(--sds-color-text-default-default)` | `#1e1e1e` | SDS body default (Sales screen) |
| `var(--sds-color-text-default-secondary)` | `#757575` | SDS secondary |
| `var(--sds-color-text-brand-on-brand)` | `#f5f5f5` | On-brand (near-white) |
| `colors/color/primitive/neutral/1000` | `#000000` | True black |
| `colors/color/primitive/neutral/800` | `#262626` | Strong body |
| `colors/color/primitive/neutral/700` | `#4a4a4a` | Table/drawer body |
| `colors/color/primitive/neutral/600` | `#6b6b6b` | Meta / grey-tertiary-normal |
| `colors/color/primitive/neutral/500` | `#8a8a8a` | Secondary / captions / drawer secondary |
| `colors/color/primitive/primary/500` | `#7e3bed` | Link, active, drawer title, status “Closed” |
| `colors/color/primitive/primary/600` | `#6b2bd6` | Navbar fill / stronger brand |
| `colors/color/primitive/primary/800` | `#431a87` | Table headers (maps to `--pc-violet-primary-dark`) |
| `colors/color/primitive/primary/900` | `#2e1260` | Darker headings / action ink cousin |
| `colors/color/semantic/success/strong` | `#0f6b3e` | Strong success |
| `colors/color/semantic/warning/default` | `#c9821a` | Warning |

### Figma sources ignored (marketing / non-app)

Do **not** treat these as app law:

- Page 1: `Landing Page` (`600:3023`), `iPhone 13 & 14 - 1` (`669:8666`), `Android Expanded - 1` (`669:8668`), `Mockup` (`780:4297`), marketing `Desktop - 17/18` near the landing cluster (`457:3984`, `457:4257`)
- Design-system page marketing: `Website Navbar`, `Landing Page`, `Founder Story`, `CTA` / `Cta`, `Footer`, `Trusted By Section`, `Why We Are Different`, `Features`, marketing `Desktop - 16`…`19`

### skipped-ambiguous

Not used as color law (could be product UI, but not clearly a core business-shell screen, or duplicates):

- Social Planner / Flows / Campaign / Offers sections (product-adjacent; not in the phase-1 high-traffic sample)
- Many unlabeled `Desktop - N` and component-spec frames on the design-system page
- Auth / login / forgot-password: **no frames on Page 1**

---

## 2. Token mapping table

Figma **intent** → existing token (prefer this; do not paste hex into features).

| Figma text role | Figma signals (app screens) | Recommended existing token / class | Notes |
|---|---|---|---|
| Primary body / default ink | `#131927`, `#1e1e1e`, `#1a1a1a`, `#000000` | `text-foreground` / `color: var(--foreground)` → `--cs-ink` → `--pc-black-secondary-normal` (`#000`) | Close enough to Figma near-black. Do not “fix” `#000` → `#131927` for pixel matching. |
| Heading / entity name (app, not marketing display) | Staff names, client names, settings H1, inbox contact name: primary/800–900 violet | `text-violet-primary-dark` or `text-violet-primary-darker` (`--pc-violet-primary-dark` / `darker`) | **Not** `text-foreground`. This is the main hierarchy gap. |
| Brand / link / interactive / drawer title | primary/500 `#7e3bed`, “Closed” status, sale #, “Add …” | `text-violet-primary-normal` / `text-primary` / `DRAWER_TITLE_CLASS` | `--primary` aliases `--cs-blue` → same violet. Prefer `violet-primary-*` in app chrome so white-label `--primary` does not recast Figma chrome. |
| Secondary / caption / preview / meta | `#8a8a8a` (neutral/500), SDS `#757575` | `text-[var(--drawer-text-secondary)]` in drawers; elsewhere `text-muted-foreground` **or** promote a dedicated secondary if we stop overloading muted | `--muted-foreground` is `#6b6b6b` (neutral/600) — a step darker/stronger than Figma secondary. |
| Tertiary / placeholder / disabled | `#9A9A9A` in appointment placeholders; light search placeholder | `text-foreground-subtle` / `placeholder:text-foreground-subtle` (`--cs-ink-3` `#b0b0b0`) | Token exists, almost unused. Today placeholders use `placeholder:text-muted-foreground`. |
| On-brand (navbar, primary button, outgoing bubble, occupancy %) | white / `#f5f5f5` | `text-white` / `text-primary-foreground` / `text-[var(--shell-navbar-foreground)]` | Healthy. |
| Drawer body copy | `#4a4a4a` | `text-[var(--drawer-text-body)]` | Already on `DATA_TABLE_CELL_CLASS`. Do not hardcode `#4A4A4A`. |
| Drawer field label | `#8a8a8a` or warm `#524346` | `DRAWER_FIELD_LABEL_CLASS` → `--drawer-text-secondary`; labels that Figma paints warm → `--drawer-text-label` | Two recipes exist; FormSheet uses `text-muted-foreground` instead (`TXT-14`). |
| Settings page title | primary/800–900 | `SETTINGS_PANEL_TITLE_CLASS` / `SETTINGS_GROUP_TITLE_CLASS` | Healthy. |
| Settings description | medium violet | `.settings-form-description` → `--pc-violet-primary-dark` | Healthy. |
| Settings idle nav item | grey | `text-muted-foreground` or `text-grey-tertiary-normal` | Today idle is `text-foreground` (`TXT-06`). |
| Settings active nav item | primary/500 + tint fill | `WORKSPACE_NAV_ITEM_ACTIVE_CLASS` | Healthy. |
| Success | `#1c9a5b`, `#0f6b3e`, Open pill | `text-success` / `text-green-success-normal` / `--drawer-confirmed-fg` | Do not use `text-emerald-*`. |
| Warning | `#c9821a`, Closed inbox pill | `text-warning` / `StatusPill variant="warning"` | Do not use `text-amber-*` for app chrome. |
| Danger | red “Add credit card”, void, errors | `text-destructive` | `--cs-red` `#dc3545`. Inbox currently uses primary ink (`TXT-08`). |
| Disabled / pagination Previous | very faded grey | `disabled:opacity-40` on `DATA_TABLE_PAGINATION_BTN_CLASS` | Intent OK; some pagers still hardcode `#8A8A8A` (`TXT-15`). |

### Semantic CSS vars (light) — current mapping

| CSS var | Resolves to | Figma role it *should* cover |
|---|---|---|
| `--foreground` | `#000000` | Primary body |
| `--muted-foreground` | `#6b6b6b` | Secondary **and** currently placeholders |
| `--foreground-subtle` | `#b0b0b0` | Tertiary / placeholder / disabled (underused) |
| `--primary` / `--primary-text` | `#7e3bed` / `#5f2cb2` | Link / brand / darker brand text |
| `--success` / `--success-foreground` | `#1c9a5b` | Success |
| `--warning` / `--warning-foreground` | `#b76e00` | Warning (Figma warning `#c9821a` is close; do not retune in this phase) |
| `--destructive` | `#dc3545` | Danger |
| `--drawer-text-*` | see theme file | Drawer-specific Figma neutrals (intentional extra scale) |

---

## 3. Findings

Sev guide: **P0** unreadable / primary body clearly wrong on core flows · **P1** consistent mismatch or wrong hierarchy across pages · **P2** polish / rare screens.

| ID | Sev | Surface/route | File(s) | Current | Expected (token/role) | Why it matters | Suggested fix type |
|---|---|---|---|---|---|---|---|
| TXT-01 | P1 | Global theme | `frontend/app/globals.css`, `frontend/lib/theme/codesol-default-theme.css`, recipes in `frontend/lib/design/*` | `--foreground` = black; headings/names in Figma are violet; `--foreground-subtle` almost unused (only defined in theme + `sheet.tsx`) | Document three ink roles: body=`text-foreground`, heading/entity=`text-violet-primary-dark(er)`, secondary=`text-muted-foreground` or `--drawer-text-secondary`, placeholder=`text-foreground-subtle` | Later agents will keep guessing. Hierarchy drift is already visible on contacts vs sales vs calendar. | Token/docs + recipe alignment (no new hex) |
| TXT-02 | P1 | Sales / checkout drawers | `frontend/features/sales/components/sales-payment-drawer-form.tsx`, `sale-edit-drawer-content.tsx`, `checkout-inline-add-section.tsx`, `checkout-line-item-row.tsx`, `new-checkout-drawer.tsx`, `gift-card-sale-dialog.tsx`, `package-sale-dialog.tsx`, `sale-close-panel.tsx`, `checkout-change-price-dialog.tsx`, `sales-workspace.tsx`, `frontend/features/sales/styles/sales-drawer-tokens.ts`, `frontend/features/gift-cards/components/gift-card-payment-picker.tsx`, `frontend/features/payments/payments-kit/invoice-collect-payment-panel.tsx` | Repeated `text-[#8A8A8A]`, `text-[#524346]`, `text-[#6B6B6B]` | `text-[var(--drawer-text-secondary)]`, `text-[var(--drawer-text-label)]`, `text-[var(--drawer-text-meta)]` | Same Figma values already live in theme. Feature hex bypasses tokens and will miss dark-mode / white-label. | Replace hex with existing drawer CSS vars |
| TXT-03 | P1 | `/business/contacts` (Clients) | `frontend/features/contacts/pages/contacts-page.tsx` | Name, email, and phone all `text-[#4A4A4A]` | Name: `text-violet-primary-darker` (Figma Clients). Email/phone: `text-[var(--drawer-text-secondary)]` or inherit `DATA_TABLE_CELL_CLASS` (`--drawer-text-body` is acceptable for secondary columns; names must be stronger/violet) | Figma: names are dark purple; email/phone are grey. Code flattens the table to one grey. | Use table recipes; drop cell-level hex |
| TXT-04 | P1 | `/business/sales` | `frontend/lib/design/data-table-tokens.ts` (`DATA_TABLE_SALE_NUMBER_CLASS`), `frontend/features/sales/components/sales-workspace.tsx` | Sale # is `--drawer-text-body` (`#4a4a4a`) | Figma Sales: sale numbers are **primary/500** (`text-violet-primary-normal`), same family as “Closed” | Comment in the token file even says “neutral/700”; Figma screen shows purple identifiers. Status class is already correct. | Change sale-number recipe to brand text class |
| TXT-05 | P1 | `/business/appointments` calendar | `frontend/features/appointments/components/calendar/staff-day-calendar-view.tsx` | Desktop staff names `text-black-secondary-normal`; mobile names `text-violet-primary-normal`; occupancy pill `bg-[#7E3BED] text-white` | Figma Calendar-day: staff names are **dark violet** (primary/800–900), not black. Occupancy: `bg-violet-primary-normal text-white` | Desktop vs mobile already disagree. Black names flatten the staff header vs Figma. | Use `text-violet-primary-darker` (or dark) on both breakpoints; drop pill hex |
| TXT-06 | P1 | `/business/settings/*` nav | `frontend/lib/design/workspace-nav-tokens.ts` (`WORKSPACE_NAV_ITEM_IDLE_CLASS`), `frontend/features/settings/components/settings-nav-panel.tsx` | Idle items `text-foreground` (black). Icons idle `text-grey-tertiary-normal` | Figma Setting-: idle labels are **grey**; active is violet on tint | Icons already follow Figma; label color does not. Idle nav competes with section headers. | Idle class → `text-muted-foreground` or `text-grey-tertiary-normal` |
| TXT-07 | P1 | `/business/dashboard` + leftover sidebar shell | `frontend/components/dashboard/*.tsx`, `frontend/components/shell/sidebar-nav-item.tsx`, `shell-brand-header.tsx`, `user-menu.tsx`, `topbar-user-actions.tsx`, `app-search-bar.tsx`, `apps-launcher.tsx` | Hardcoded `#12172b` / `#5b6478` / `#98a1b5` (CodeSol navy/slate). Some `dark:text-foreground` patches | App law is PandaCue: `text-foreground`, `text-muted-foreground`, `text-violet-primary-*`. Figma Page 1 has **no** metrics-dashboard frame; this palette does not appear on Calendar/Sales/Inbox/Settings | Parallel brand on a live business route. Sidebar path is unused when `navMode === "main"` but dashboard cards still render. | Retoken dashboard cards; leave sidebar as follow-up if dead |
| TXT-08 | P1 | Inbox details `/business/inbox` | `frontend/lib/design/drawer-tokens.ts` (`DRAWER_CLIENT_CREDIT_CARD_CLASS`), `frontend/features/conversations/components/inbox/conversation-details-sidebar.tsx` | “Add credit card” uses `--drawer-text-primary` (`#1a1a1a`) | Figma Inbox-reply: that row is **danger red** (`text-destructive`) | Same control, wrong role (body vs danger/link). | Point recipe at `text-destructive` |
| TXT-09 | P1 | Sales totals, waitlist, social, whatsapp, payments | e.g. `sale-edit-drawer-content.tsx`, `sales-workspace.tsx` (`text-emerald-700`); `waitlist-panel.tsx`; `social-post-status-badge.tsx`; `whatsapp-template-display.util.ts`; `financial-summary-card.tsx` | Tailwind `emerald` / `red-600` / `amber` / `blue` scales | `text-success`, `text-destructive`, `text-warning`, `StatusPill` variants | Default Tailwind greens are not PandaCue `#1c9a5b`. Dark-mode variants are ad hoc. | Map to semantic status tokens |
| TXT-10 | P1 | Appointment drawers | `appointment-detail-drawer.tsx`, `appointment-client-card.tsx`, `appointment-service-line-editor.tsx`, `appointment-status-actions.tsx`, `appointment-time-block-drawer.tsx`, `time-block-update-form.tsx`, `appointment-service-card.tsx` | Mix of `text-[#1A1A1A]`, `text-[#9A9A9A]`, `text-[#7E3BED]`, `text-[#5C2BB5]`, `text-[#6B6B6B]` **and** `DRAWER_*` recipes | Client name `DRAWER_CLIENT_NAME_CLASS` (`text-violet-primary-darker`); body `--drawer-text-primary`; placeholder `placeholder:text-foreground-subtle`; links `text-violet-primary-normal` | Shared drawer tokens already exist; guest card and line editor fork hex. | Delete hex; reuse `lib/design/drawer-tokens` |
| TXT-11 | P2 | Inputs / search globally | `frontend/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`, `combobox.tsx`, `DATA_TABLE_SEARCH_STANDALONE_CLASS`, `AUTH_FIELD_INPUT_CLASS` | `placeholder:text-muted-foreground` (`#6b6b6b`) | Figma placeholders are lighter (appointment drawers `#9A9A9A`; settings “Enter business name” is clearly weaker than labels) → `placeholder:text-foreground-subtle` | Secondary labels and placeholders currently share one color. | Switch placeholder recipe only |
| TXT-12 | P2 | Inbox list heading | `frontend/features/conversations/components/inbox/conversation-list-panel.tsx` | `text-heading-5 … text-violet-primary-dark` | Figma “Conversation” is **primary/500** (brighter), closer to `text-violet-primary-normal` | Same family, one step too dark. | Swap to `text-violet-primary-normal` |
| TXT-13 | P2 | Auth (`/login`, password flows) | `frontend/lib/design/auth-tokens.ts` (`AUTH_FOOTER_LINK_CLASS`), `frontend/features/auth/components/auth-panel.tsx` | Title inherits `text-foreground`; footer links `text-foreground` until hover violet | No Page 1 auth frames. App-link convention is violet (`text-violet-primary-normal`). Description `text-muted-foreground` is fine. | Low risk; only if we want auth links to match in-app links. | Optional: default link class to brand |
| TXT-14 | P2 | Drawer labels | `DRAWER_FIELD_LABEL_CLASS` vs `DRAWER_FIELD_LABEL_SHELL_CLASS` in `frontend/lib/design/drawer-tokens.ts` | Figma spine drawers: `--drawer-text-secondary`. FormSheet: `text-muted-foreground` | One label role per drawer family | Two recipes, same UI family, slightly different grey. | Alias FormSheet label to `--drawer-text-secondary` |
| TXT-15 | P2 | Calendar gutter + list pagination | `time-grid-shared.tsx` (`text-[#6B6B6B]`), `frontend/components/ui/list-pagination.tsx` (`text-[#8A8A8A]`), `list-filters-popover.tsx` (`text-[#4A4A4A]`, `text-[#5F2BB2]`) | `text-[var(--drawer-text-meta)]` / `text-muted-foreground` / `text-violet-primary-dark` | Hardcoded duplicates of tokens already used by `DATA_TABLE_PAGINATION_*`. | Replace with recipes |
| TXT-16 | P2 | Public booking spinner | `frontend/features/public-booking/components/public-booking-page.tsx` | `style={{ color: "#0069ff" }}` | `text-primary` / `text-violet-primary-normal` | Leftover default blue, not PandaCue. Public surface is in `frontend/` but not a Page 1 app frame. | Tokenize |
| TXT-17 | P2 | Contacts workspace CSS | `frontend/features/contacts/styles/contacts-split-layout.css` | Tab idle `color: #6b6b6b`; active `var(--cs-brand)` | `color: var(--muted-foreground)` / `var(--pc-violet-primary-normal)` | Local `--cs-brand` alias is OK-ish; raw `#6b6b6b` is not. | CSS var only |
| TXT-18 | P2 | Calendar / pipeline status extras | `staff-day-calendar-view.tsx` avatar `text-[#703253]`; `working-hours-overlays.tsx`; `work-item-status-colors.ts` / `pipeline-stage-colors.ts` `text-[hsl(192_70%_32%)]` | Prefer `--drawer-client-avatar-fg` (already `#703253`) and semantic status tokens | Isolated, but still hex/hsl bypass. | Point at existing avatar/status vars |

---

## 4. ID rules

Stable short IDs: `TXT-01` … `TXT-18`. Do not renumber. Add `TXT-19+` for later findings.

---

## 5. Sev guide (applied)

- **P0:** Unreadable, or primary body color clearly wrong on calendar / sales / contacts / inbox / settings / auth. **None found.**
- **P1:** Wrong hierarchy on a high-traffic surface, or the same bypass repeated across files (hex clusters, emerald-vs-success, leftover navy).
- **P2:** Single-step shade (heading 800 vs 500), rare routes, placeholders, public booking.

---

## 6. Do not fix (intentional / out of policy)

Treat these as **not** defects in a later fix PR unless product explicitly changes the policy:

1. **`--foreground` = `#000000` rather than Figma `#131927` / `#1e1e1e`.** Theme maps Black-Secondary. Contrast is fine. Do not retune global ink to a Figma specimen hex.
2. **`--warning` `#b76e00` vs Figma `#c9821a`.** Close; not a hierarchy bug.
3. **Navbar / primary buttons / occupancy / outgoing bubbles use white on violet.** Matches on-brand role.
4. **Table headers `text-violet-primary-dark`.** Matches Sales/Clients Figma.
5. **Settings titles + `.settings-form-description` violet.** Matches Setting- frame.
6. **Drawer titles `text-violet-primary-normal`.** Matches spine drawers.
7. **`--drawer-*` extra neutrals in `codesol-default-theme.css`.** Intentional Figma drawer scale. Features should *consume* them, not duplicate hex (`TXT-02` / `TXT-10`).
8. **Dark mode remaps** (`--cs-ink: #ffffff`, etc.). Figma app screens are light-only; do not “fix” dark mode to Page 1.
9. **Calendar filter chrome staying transparent** — called out as intentional in `.cursor/rules/frontend-design-system.mdc`.
10. **Public chatbot `config.primaryColor`.** Client white-label, not a Figma hex paste.
11. **Typography size/weight scale** (`--text-heading-*`, `--text-body-*`) copied from the DS Typography frame. This audit is **color roles only**.
12. **Marketing landing type colors** (large black display on the DS specimen). Not app law.
13. **Pixel-matching 1–2 shade steps** on otherwise correct roles (e.g. `#6b6b6b` vs `#8a8a8a` on a single caption) unless it is part of a listed ID.

---

## 7. Recommended parallel fix batches

Group by shared token/file. **Max ~5–8 IDs per batch.** Later agents should stay inside one batch.

### Batch A — Token roles (no feature restyle except recipes)

- IDs: **TXT-01, TXT-11, TXT-14**
- Touch: `globals.css` comments / ownership notes, `input.tsx` / `textarea.tsx` / `select.tsx` placeholder class, `DRAWER_FIELD_LABEL_SHELL_CLASS`
- Do not invent new hex. Wire `--foreground-subtle` for placeholders.

### Batch B — Sales / checkout / gift-card hex wipe

- IDs: **TXT-02, TXT-04** (+ sales rows of **TXT-09**)
- Touch: `data-table-tokens.ts` sale-number class; sales drawer components listed in TXT-02; gift-card picker; invoice collect panel
- Replace `#8A8A8A` / `#524346` / `#6B6B6B` with `--drawer-text-*`. Sale # → `text-violet-primary-normal`. Totals → `text-success` not `text-emerald-700`.

### Batch C — Contacts list hierarchy

- IDs: **TXT-03, TXT-17**
- Touch: `contacts-page.tsx` column cells; `contacts-split-layout.css` idle tab color
- Names use heading-violet; email/phone inherit table body/secondary.

### Batch D — Appointments calendar + drawers

- IDs: **TXT-05, TXT-10, TXT-15** (calendar/pagination/filter files), **TXT-18**
- Touch: `staff-day-calendar-view.tsx`, `time-grid-shared.tsx`, appointment drawer files in TXT-10, `list-pagination.tsx`, `list-filters-popover.tsx`
- Reuse `drawer-tokens` + `violet-primary-*`. No new feature token files.

### Batch E — Settings nav idle

- IDs: **TXT-06**
- Touch: `workspace-nav-tokens.ts` idle class (also used by Team/Services/Resources asides — verify those Figma settings sidebars stay grey-idle).

### Batch F — Dashboard leftover navy/slate

- IDs: **TXT-07**
- Touch: `frontend/components/dashboard/*` first (live business home). Sidebar/topbar hex only if those components still render for `navMode !== "main"` (platform).
- Map `#12172b` → `text-foreground`, `#5b6478` → `text-muted-foreground`, `#98a1b5` → `text-muted-foreground` or `text-foreground-subtle`.

### Batch G — Inbox danger + heading shade

- IDs: **TXT-08, TXT-12**
- Touch: `DRAWER_CLIENT_CREDIT_CARD_CLASS`, `conversation-list-panel.tsx`
- Small, isolated.

### Batch H — Status palettes + leftovers

- IDs: **TXT-09** (non-sales), **TXT-13, TXT-16**
- Touch: waitlist, social badges, whatsapp template tones, auth footer link (optional), public booking spinner.
- Stay on `--success` / `--warning` / `--destructive`. Skip marketing.

---

## 8. Audit-only note

This PR adds **`docs/audits/phase1-text-color-audit.md` only**.

- No `frontend/` runtime, CSS, or token values were changed.
- No Figma file was edited.
- Do not merge a “fix” into this branch; spawn the batches above on separate PRs against `development`.

### Method notes

- Figma MCP: `get_metadata` on Page 1 + Components page; `get_variable_defs` on Calendar-day, Sales, Inbox-reply, Typography, Color; screenshots of Calendar-day, Sales, Clients, Inbox-reply, Setting-, Typography.
- After those calls, Figma Starter MCP rate-limited further screenshots (checkout / appointment drawers / text-field spec). Checkout and appointment findings therefore combine Page 1 metadata, variables from sibling screens, and code inspection of the matching recipes.
- Code scan: `text-[#…]`, `text-(gray|emerald|red|amber|…)`, inline `style={{ color }}`, leftover `#12172b` / `#98a1b5`, and recipe files under `frontend/lib/design` + feature `*-tokens.ts`.
)
