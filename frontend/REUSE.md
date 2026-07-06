# Frontend reuse tiers (CodeSol)

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

### List pages

Use `ListPage` + `ListToolbar` + `DataTable` + `StatusPill` for table views.

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
