# Snapshot Labels & Tabs UX Report

## Summary

The snapshot editor was redesigned from a three-column layout (left sidebar, center content, right live preview) to a top tab navigation pattern. Terminology editing was replaced with a WordPress-style entity label system that hides internal dot-keys from admins while persisting flat terminology keys for backward compatibility.

## 1. Top Tab Navigation

- **Added** `snapshot-editor-tabs.tsx` — bordered pill buttons modeled on `IntegrationCategoryTabs`, with horizontal scroll on mobile (`overflow-x-auto`, `min-w-max`).
- **Tabs:** Overview, Labels, Navigation, Dashboard, CRM, Calendars, Chatbots, Emails, Branding, Integrations, Preview, Advanced.
- **Removed** left `editor-sidebar.tsx` and the right-side `SnapshotPreviewPanel` on non-preview tabs.
- **Removed** the Validation tab; validation is now part of the Publish flow.
- **Updated** `platform-snapshot-detail-page.tsx` to use tabs below the top bar.

## 2. WordPress-Style Entity Label System

- **Added** `frontend/lib/config/snapshot/entity-label-registry.ts`:
  - Entities: `contact`, `lead`, `pipeline`, `workItem`, `appointment`, `invoice`, `estimate`, `conversation`, `payment`.
  - WordPress-inspired fields per entity: `name`, `singular_name`, `menu_name`, `all_items`, `add_new`, `add_new_item`, `edit_item`, `new_item`, `view_item`, `view_items`, `search_items`, `not_found`, `not_found_in_trash`, `item_published`, `item_updated`.
  - `flattenEntityLabels()` / `expandEntityLabels()` / `resetEntityLabels()` for round-trip mapping.
  - `menu_name` maps to `nav.*` keys; other fields map to `entities.{entity}.*` flat keys.
- **Extended** `frontend/lib/config/snapshot/default-terminology.ts` and `backend/.../snapshot-assets.types.ts` `DEFAULT_TERMINOLOGY` with all new WP-style label keys.
- **Added** `nav.invoices` and `nav.estimates` navigation keys.

## 3. Labels Tab

- **Added** `entity-labels-builder.tsx` replacing `terminology-builder.tsx`:
  - **Section A:** Navigation labels (card grid for `nav.*` keys).
  - **Section B:** One card per entity with all WP-style fields, reset-entity button, default hints, and mini preview snippet (`Add New …`).
  - **Section C:** Actions & Public (booking labels).
  - Entity search filter, reset-all, no dot-keys shown to admins.
- **Deleted** `terminology-builder.tsx`.

## 4. Runtime Terminology

- **Extended** `resolve-terminology.ts` with `resolveEntityLabel()`, `createEntityLabelResolver()`.
- **Extended** `use-terminology.ts` with `tEntity(entity, field, fallback)` and `entityResolver`.

## 5. Preview Tab

- **Updated** `preview-center-builder.tsx` for full-width layout when Preview tab is active.
- Shows sidebar mock, dashboard widgets, entity label examples (`add_new_item`), booking header, and chatbot widget preview from in-memory editor assets.

## 6. Publish Validation Modal

- **Added** `publish-validation-modal.tsx`.
- **Updated** `use-snapshot-editor.tsx`:
  - `requestPublish()` opens the modal with `validateSnapshotForPublish()` results.
  - `confirmPublish()` saves if dirty, then publishes.
  - Publish is blocked only when errors exist; warnings are informational.
- **Deleted** `validation-center-builder.tsx`.

## 7. Section Type Changes

- `SnapshotEditorSection`: `terminology` → `labels`; `validation` removed.
- Validation messages reference `labels` section instead of `terminology`.

## 8. Backward Compatibility

- `expandEntityLabels()` fills missing WP-style fields from defaults for old snapshots that only had `plural`/`singular`/`nav.*` keys.
- Saving still writes flat `terminology` keys on `SnapshotAssets`.
- GET `/businesses/current/snapshot-context` response shape unchanged.

## 9. Tests

| File | Coverage |
|------|----------|
| `entity-label-registry.test.ts` | expand defaults, flatten keys, roundtrip, reset entity |
| `resolve-terminology.test.ts` | `tEntity` / `resolveEntityLabel` helpers |

```bash
cd frontend && npm test && npx tsc --noEmit
# 10 test files, 36 tests passed; tsc clean
```

## Files Changed

### Added
- `frontend/features/platform/components/snapshot-builders/snapshot-editor-tabs.tsx`
- `frontend/features/platform/components/snapshot-builders/entity-labels-builder.tsx`
- `frontend/features/platform/components/snapshot-builders/publish-validation-modal.tsx`
- `frontend/lib/config/snapshot/entity-label-registry.ts`
- `frontend/lib/config/snapshot/entity-label-registry.test.ts`
- `SNAPSHOT_LABELS_AND_TABS_REPORT.md`

### Modified
- `frontend/features/platform/pages/platform-snapshot-detail-page.tsx`
- `frontend/features/platform/hooks/use-snapshot-editor.tsx`
- `frontend/features/platform/components/snapshot-builders/editor-section-content.tsx`
- `frontend/features/platform/components/snapshot-builders/preview-center-builder.tsx`
- `frontend/features/platform/utils/snapshot-validation.ts`
- `frontend/lib/config/snapshot/default-terminology.ts`
- `frontend/lib/snapshot/resolve-terminology.ts`
- `frontend/lib/snapshot/resolve-terminology.test.ts`
- `frontend/lib/snapshot/use-terminology.ts`
- `backend/libs/modules/platform/snapshots/types/snapshot-assets.types.ts`

### Deleted
- `frontend/features/platform/components/snapshot-builders/editor-sidebar.tsx`
- `frontend/features/platform/components/snapshot-builders/terminology-builder.tsx`
- `frontend/features/platform/components/snapshot-builders/validation-center-builder.tsx`
