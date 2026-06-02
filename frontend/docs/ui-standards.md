# UI standards

Enterprise SaaS UI on **shadcn (base-nova)** + **Tailwind v4**. Tokens live in `app/globals.css`. Composites live in `components/forms/`, `components/data-display/`, and `components/layout/`.

## Design language

- **Grayscale foundation** with a single cool accent (sidebar active, focus rings)
- **Subtle elevation** via `shadow-elevation-*` tokens — avoid flat admin-template cards
- **Compact density** — `--control-height`, `--table-row-height`, no oversized marketing type
- **No `capitalize`** on buttons, menus, or selects — use natural casing

## Border radius

Base `--radius: 0.375rem` (6px). Prefer `rounded-md` / `rounded-lg` only.

## Buttons

Use `ActionButton` from `@/components/ui/action-button` for **Save**, **Cancel**, **Create**, **Delete**, and list-page primary CTAs. Height is `var(--control-height)` (2.25rem), matching form inputs.

| Use case | Component | Variant | Size |
|----------|-----------|---------|------|
| Save / Cancel / Create / Delete | `ActionButton` | `default` / `outline` / `destructive` | `default` (built-in) |
| Form dialog footer | `FormDialog` | — | uses `ActionButton` |
| Page primary CTA | `ActionButton` | `default` | `default` |
| Toolbar / filters (search, selects, Today) | `SearchInput`, `SearchableSelect`, `Button` | `outline` / default | `var(--control-height)` — see `lib/control-styles.ts` |
| Pagination | `Button` | `outline` | `sm` (same height via token) |
| Table row actions | `IconButton` | `ghost` | `icon-sm` |
| Delete confirm | `AlertDialogAction` | `destructive` | `default` |

No press-down animation. Focus: `ring-[3px] ring-ring/40`.

## Layout primitives

| Component | Purpose |
|-----------|---------|
| `PageContainer` | Max-width page wrapper + section spacing |
| `PageSection` | Titled content block with optional actions |
| `PageHeader` | Title/description/actions (list pages use `showTitle`) |
| `ListPage` | Composes `PageContainer` + header + filters + content |
| `DataToolbar` | Filters + meta + actions row (stack on mobile) |
| `FilterBar` | Inline filter controls |
| `SettingsCard` | Settings panels with header/footer |
| `FormSection` | Grouped form fields with legend |
| `ActionBar` | Sticky or inline form/page actions |
| `StatsCard` | Dashboard metric tiles |

## List pages

1. `ListPage` or `PageContainer` + `PageHeader`
2. `DataToolbar` or `FilterBar` for filters
3. `DataTable` with optional `toolbar` slot and `density="compact"`
4. `ConfirmDeleteDialog` for deletes
5. URL state via `useListSearchParams` + debounced search

## Forms

- **Dialogs:** `FormDialog` (size: `sm` | `md` | `lg` | …) with sticky `DialogFooter`
- **Sections:** `FormSection` inside sheets/settings
- **Fields:** `TextField`, `SelectField`, `FormItem` (`gap-1.5`)

## Tables

- `DataTable` — sticky header, row hover, actions column
- `density="compact"` for dense operational views
- `toolbar` prop for inline `DataToolbar`
- `EmptyState` / skeleton rows built-in

## Dialogs & sheets

- `DialogContent` `size` prop: `sm` | `md` | `lg` | `xl` | `2xl` | `full`
- Structured: `DialogHeader` → `DialogBody` → `DialogFooter`
- Legacy content without header still gets padding via `:not-has` fallback
- Sheets: `SheetHeader` → `SheetBody` → `SheetFooter`

## Empty & loading

- `EmptyState` — minimal icon tile, compact mode for tables
- `LoadingState` — `inline` | `block` | `skeleton`
- `ComingSoon` — uses `SettingsCard`

## Shell

- Sidebar: active rail indicator, 14.5rem width, separated from main `background`
- Topbar: frosted `backdrop-blur`, breadcrumb or page title
- Content: `var(--page-padding-x/y)` responsive padding
