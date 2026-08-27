# Frontend reuse tiers (PandaCue)

This app uses a **single Next.js frontend** with strict tiers so shared UI can be copied into future niche apps without a monorepo split.

## Tiers

| Tier | Path | May import |
|------|------|------------|
| 1 | `components/ui`, `components/forms`, `components/data-display` | `lib/`, never `features/` |
| 2 | `lib/` | API client, auth, utils, config |
| 3 | `components/shell`, `components/layout` | Tier 1 + 2; avoid `features/` where possible |
| 4 | `features/<domain>/` | All tiers above + domain API/hooks |

## Patterns

### Drawer-first CRUD

Use `FormSheet` + `FormSheetSection` from list/dashboard contexts:

```tsx
<FormSheet open={open} onOpenChange={setOpenChange} title="..." form={form} onSubmit={...}>
  <FormSheetSection title="Basic info">...</FormSheetSection>
</FormSheet>
```

Keep `FormDialog` / `AlertDialog` for confirms and tiny pickers only.

### List pages (DataTable)

Use `EntityListLayout` for every screen that shows a DataTable. Do not assemble primary action + search + filter + `DataTable` by hand.

```tsx
<EntityListLayout
  title="Forms"
  addButtonLabel="Create form"
  onAdd={() => setCreateOpen(true)}
  searchPlaceholder="Search"
  searchValue={params.search}
  onSearchChange={(v) => setParams({ search: v, page: "1" })}
  filterContent={
    <ListFilterCheckboxGroup
      legend="Status"
      options={STATUS_OPTIONS}
      value={draftStatus}
      onChange={(next) => setDraftStatus(String(next))}
    />
  }
  onFilterApply={() => setParams({ status: draftStatus })}
  columns={columns}
  data={items}
  getRowId={(row) => row.id}
/>
```

- Toolbar (primary left, search + filter icon right) and table live in the composite
- Filter icon opens the shared `OptionsFilterDrawer` (Appointments-style sidebar)
- Nested tabs: `hideHeader` + `flush` so parent chrome owns padding
- Full width: `ENTITY_LIST_PAGE_INSET_CLASS` is `px-0`; toolbar and table span the content area
- Tokens: `ENTITY_LIST_PAGE_INSET_CLASS`, `WORKSPACE_TABLE_CARD_CLASS` in `frontend/lib/design/workspace-tokens.ts`

### Entity workspaces (list + detail drawer)

Pair `EntityListLayout` with `EntityDetailDrawer`:

```tsx
<EntityDetailDrawer
  open={isOpen}
  onOpenChange={(open) => !open && clearSelection()}
  title={...}
  tabs={...} // optional underline tabs via EntityDetailTabs
>
  {detailContent}
</EntityDetailDrawer>
```

- Selection URL: `?id=` (+ optional `?tab=`) via `useEntitySelection`
- Drawer chrome: `EntityDetailDrawer`, `EntityDetailHeader`, `EntityDetailSection`
- Tokens: `frontend/lib/design/workspace-tokens.ts`
- Secondary nav: flat primary sidebar + **Apps** launcher (`AppsLauncher`)

### Entity detail drawer content (standard anatomy)

Row-click drawers use a **5-slot anatomy**. Do not mix navigation levels.

| Slot | Component | Purpose |
|------|-----------|---------|
| Header | `EntityDetailHeader` | Identity, status, max 2 inline actions, overflow for destructive |
| Tabs | `EntityDetailTabs` | L1 **sections** only (underline). Max 5. URL `?tab=` |
| Summary | `EntityDetailSummaryStrip` | Optional collapsible metadata (phone, email) — not duplicate of header |
| Toolbar | `EntityDetailToolbar` | L2 **in-tab** filters + actions. Fixed below tabs (not in scroll body). Use `EntityDetailLinkFilter` for timeline-style filters |
| Body | `EntityDetailSection` / `EntityDetailTimeline` | Scrollable content only |
| Footer | `EntityDetailFooter` | Primary workflow CTA (Save, Go to payments) |

**Width tiers** (`width` on `EntityDetailDrawer`):

| Tier | Width | Recipe | Examples |
|------|-------|--------|----------|
| `compact` | 480px | A Inspect | transactions, form submissions, products |
| `standard` | 560px | B Operate | packages, memberships, time cards |
| `wide` | 640px | B/C | contacts timeline, sales, offers, invoices, estimates |

**Recipes:**

- **A Inspect** — read-only fields, optional footer CTA
- **B Operate** — tabs + link filters in toolbar slot + scrollable feed (contacts timeline is the reference)
- **C Transact** — toolbar add-line actions + editable body + dominant footer CTA

**Anti-patterns:**

- Do not use filled pill buttons for in-tab filters (prefer `EntityDetailLinkFilter`; `EntityDetailSegmentedFilter` only when pills are required)
- Do not repeat entity name/contact info in body when header already shows it
- Do not put destructive actions in both header and footer
- Do not add a third nested tab row inside body

```tsx
<EntityDetailDrawer
  open={isOpen}
  onOpenChange={(open) => !open && clearSelection()}
  title="Contact details"
  width="split"
  bodyClassName="!gap-0 !overflow-hidden !p-0"
  overflowActions={[/* print, delete */]}
>
  <ContactDetailPanel
    embedded
    noteComposerOpen={noteComposerOpen}
    onNoteComposerOpenChange={setNoteComposerOpen}
  />
</EntityDetailDrawer>
```

Contacts use a **split drawer** (`width="split"`, 900px): left profile panel (avatar, phone, email, notes) + right panel (tabs, filters, timeline).

### Dashboard

Use `GET businesses/current/dashboard-feed` via `features/dashboard/api/dashboard.api.ts` for a single round-trip (stats + pulse + attention).

### Global search

Topbar ⌘K opens `AppCommandPalette` → `GET search?q=`.

### White-label

Snapshot branding applies via `ClientThemeApplier` + CSS variables in `lib/theme/`. Do not hardcode client colors in feature components.

## Shell data

`AppShellLayout` loads workspace name through `lib/hooks/use-shell-current-business.ts` (not `features/settings`).

## ESLint

Tier 1 folders enforce `no-restricted-imports` from `@/features/**`.
