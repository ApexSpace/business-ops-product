# Snapshot System Implementation Report

This document summarizes the snapshot (“business blueprint”) system as implemented in the Business Automation Application workspace. Snapshots package terminology, navigation, dashboard layout, CRM defaults, calendars, chatbots, email assets, branding, and integration hints into a versioned JSON document that platform operators manage and that is applied when businesses are created.

---

## Backend Changes

- **New Nest module** `backend/libs/modules/platform/snapshots/` wired into `PlatformModule` and consumed by `AuthModule` and `BusinessModule`.
- **Controllers**
  - `PlatformSnapshotsController` (`/platform/snapshots`): list, get, create, update, publish, archive, clone, apply-to-business, soft-delete. Guarded by `PlatformRolesGuard` and platform snapshot permissions.
  - `BusinessSnapshotContextController` (`GET /businesses/current/snapshot-context`): read-only resolved context for the active business member session.
- **Services**
  - `SnapshotsService`: CRUD, lifecycle (draft → published → archived), clone, platform apply orchestration, `resolveForBusiness()` (id or default published).
  - `SnapshotApplyService`: transactional provisioning of CRM/calendar/chatbot/email assets with idempotent `snapshot_provisions` tracking.
  - `SnapshotValidationService`: class-validator DTO graph + registry checks (routes, icons, widgets).
  - `SnapshotContextService`: maps published snapshot assets to API context DTO, with `DEFAULT_SNAPSHOT_CONTEXT` fallback.
- **Supporting layers**: `SnapshotRepository`, mappers (`snapshot.mapper`, `snapshot-assets.parser`), registries (routes, icons, dashboard widgets), seed definitions/assets, constants for default context.
- **Integration**
  - `AuthService.register()` resolves a published snapshot and calls `SnapshotApplyService.apply()` after user/business creation (no inline pipeline/service seeding).
  - `BusinessService.create()` uses the same resolve + apply path for platform-created businesses.
- **Tooling**: `backend/scripts/generate-snapshot-migration.mjs` regenerates migration SQL from `SNAPSHOT_SEED_DEFINITIONS` (kept in sync with TypeScript seeds).
- **Registration DTO**: optional `snapshotId` on register; business profile DTO extended similarly.

---

## Database Changes

- **Migration** (consolidated): `backend/prisma/migrations/20260607120000_snapshots_system/`
  - Duplicate folder `20260607120000_snapshot_system/` was removed to avoid two migrations with the same timestamp prefix and conflicting SQL ordering.
- **Enum** `SnapshotStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- **Table** `snapshots`: name, description, `assets` JSONB, status, publish/audit fields, soft delete.
- **Table** `snapshot_provisions`: per-business mapping from `(businessId, snapshotId, sourceKey)` → provisioned `entityId` and `assetType`; unique composite index for idempotency.
- **Business columns**: `snapshotId` (FK, indexed), `snapshotAppliedAt`.
- **Tag column**: `color` (for snapshot-provisioned tags).
- **Migration data**: inserts four published seed snapshots with fixed UUIDs; backfills existing non-deleted businesses with the default snapshot pointer only (no reprovision of entities).

---

## Snapshot Asset Schema

Assets are stored as JSONB matching `SnapshotAssets` (`snapshot-assets.types.ts`):

| Section | Purpose |
|--------|---------|
| `terminology` | Key → label strings for nav, entities, dashboard copy |
| `navigation` | Ordered nav items: `key`, `route`, `icon`, `labelKey`, `order` |
| `dashboard` | `widgets` (registry keys + order), `quickLinks` (`href`, labels, order) |
| `crm` | Optional `pipelines`, `services`, `tags` with `sourceKey` for provisioning |
| `calendars` | Calendar definitions + default availability |
| `chatbots` | Bot config + rules (`sourceKey` per rule) |
| `emails` | Preferences and templates by `emailType` |
| `branding` | Product name, accent color, optional logo/public title |
| `integrations` | Recommended integration slugs (informational) |

`parseSnapshotAssets` normalizes legacy shapes (e.g. `route` → `href` on quick links). `EMPTY_SNAPSHOT_ASSETS` and `DEFAULT_TERMINOLOGY` provide safe defaults.

---

## Snapshot Lifecycle

1. **Create** — Draft snapshot with validated assets.
2. **Update** — Draft-only edits (published snapshots are immutable via update; use clone).
3. **Publish** — Sets `PUBLISHED`, `publishedAt`; validates assets against registries.
4. **Archive** — Moves to `ARCHIVED`; no longer selectable for new businesses.
5. **Clone** — New draft copy from an existing snapshot.
6. **Delete** — Soft delete (`deletedAt`) when allowed by service rules.
7. **Platform apply** — `POST .../apply` re-runs apply service for a chosen business (admin operation).

Businesses retain `snapshotId` / `snapshotAppliedAt` pointing at the snapshot version applied at creation (or backfill).

---

## Snapshot Apply Behavior

`SnapshotApplyService.apply(businessId, snapshotId, actorUserId?)` runs inside a Prisma transaction:

1. Updates business `snapshotId` and `snapshotAppliedAt`.
2. For each asset category, looks up `snapshot_provisions` by prefixed `sourceKey` (e.g. `pipeline:default-pipeline`).
3. If provision exists, skips creation (idempotent re-apply).
4. Otherwise creates entity and records provision row.

**Provisioned types**: pipelines (+ stages), services, tags, calendars (+ default weekly availability), chatbots (+ rules), email preferences, email templates.

**Explicitly not provisioned**: contacts, leads, deals, or other customer data.

Email/chatbot creation uses existing module utilities (settings bundle, public key generation, email type registry).

---

## Business Creation Integration

| Flow | Behavior |
|------|----------|
| Self-serve **register** | `SnapshotsService.resolveForBusiness(input.snapshotId)` → default published or specified id → `SnapshotApplyService.apply` after transactional user/business/membership create. |
| Platform **create business** | Same resolve + apply after business row created; audit log unchanged aside from snapshot-driven provisioning. |

Legacy inline default pipeline/service creation was removed from these paths in favor of snapshot assets.

---

## Snapshot Context API

- **Endpoint**: `GET /businesses/current/snapshot-context`
- **Auth**: Business member (owner/admin/member) via `BusinessRolesGuard`.
- **Response**: `snapshotId`, `snapshotName`, `contextVersion` (snapshot `updatedAt` ISO), `terminology`, `navigation`, `dashboard`, `branding`.
- **Fallback**: If business has no published snapshot, returns `DEFAULT_SNAPSHOT_CONTEXT` (matches frontend default config).

Frontend client: `frontend/features/settings/api/snapshot-context.api.ts`.

---

## Frontend Caching Strategy

- **React Query** (`snapshotContextQueryOptions`): `staleTime: Infinity`, `gcTime` 24h, no refetch on focus/reconnect — context treated as stable per business session unless version changes.
- **Session storage** (`snapshot-context-storage.ts`): Persists trimmed context per `businessId` for instant shell render before network completes; provider hydrates from storage then fetches.
- **Query key**: `queryKeys.business.snapshotContext(businessId)`.
- **`SnapshotContextProvider`** wraps business app layout; `useSnapshotContext` exposes context to shell, dashboard, terminology hooks.

---

## Frontend Navigation Changes

- **Registries**: `route-registry.ts`, `icon-registry.ts` mirror backend allowed routes/icons.
- **`resolveSnapshotNavigation`**: Filters unknown routes, sorts by order, resolves labels via terminology, maps icons to Lucide components.
- **`AppShellLayout`**: Uses snapshot navigation when business context is loaded; falls back to static business menu when context unavailable.
- **Route audit**: `backend/scripts/audit-frontend-routes.mjs` updated to include snapshot registry coverage.

---

## Terminology Changes

- **`resolve-terminology.ts`**: Merges snapshot terminology over `default-terminology.ts` defaults.
- **`useTerminology` hook**: Consumes snapshot context for components (dashboard stat labels, nav, etc.).
- Keys follow convention: `nav.*`, `entities.*`, `dashboard.*`, `actions.*`.

---

## Dashboard Changes

- **`resolve-dashboard-widgets`**: Orders and filters widgets by snapshot config against `widget-registry.ts`.
- **`business-dashboard-stats.tsx`**: Uses terminology resolver for stat titles.
- **`business/dashboard/page.tsx`**: Renders widgets and quick links from resolved snapshot dashboard config.

---

## Platform Snapshot UI

- **Routes**: `/platform/snapshots`, `/platform/snapshots/[id]`.
- **Pages**: `platform-snapshots-page.tsx`, `platform-snapshot-detail-page.tsx`.
- **Components**: create dialog, apply dialog, preview panel (assets summary).
- **API**: `snapshots.api.ts`; form schema `snapshot-form.ts`; types in `features/platform/types/snapshot.ts`.
- **Navigation**: Platform menu entry + page metadata; permission `platform.snapshots.manage`.

---

## Seeded Snapshots

Defined in `SNAPSHOT_SEED_DEFINITIONS` and upserted in `backend/prisma/seed.ts` (by fixed `id`):

| ID | Name |
|------|------|
| `a0000000-0000-4000-8000-000000000001` | Default Business Snapshot |
| `a0000000-0000-4000-8000-000000000002` | Dental Practice Snapshot |
| `a0000000-0000-4000-8000-000000000003` | Legal Practice Snapshot |
| `a0000000-0000-4000-8000-000000000004` | Home Services Snapshot |

Same definitions are embedded in the consolidated SQL migration for fresh databases. `resolveForBusiness()` falls back to the default published snapshot (`DEFAULT_SNAPSHOT_ID`) when no `snapshotId` is passed.

---

## Tests Added

**Backend** (Jest, `--testPathPatterns=snapshot`):

| File | Focus |
|------|--------|
| `snapshot-apply.service.spec.ts` | Provisioning, idempotent re-apply, no contact/lead mutation |
| `snapshot-validation.service.spec.ts` | Asset validation/sanitization |
| `snapshot-context.service.spec.ts` | Context resolution and fallback |
| `snapshots.service.spec.ts` | Service lifecycle / resolve behavior |

**Frontend** (Vitest):

| File | Focus |
|------|--------|
| `resolve-snapshot-navigation.test.ts` | Nav resolution and filtering |
| `resolve-dashboard-widgets.test.ts` | Widget ordering/registry |
| `resolve-terminology.test.ts` | Terminology merge |
| `snapshot-context-query.test.ts` | Query options / caching constants |

**Results (this completion pass)**:

- Backend snapshot tests: **4 suites, 13 tests — all passed**
- Frontend full test run: **9 files, 30 tests — all passed**

---

## Performance Notes

- Snapshot context is fetched once per business with aggressive stale caching; suitable because changes are rare and versioned via `contextVersion`.
- Apply runs in a single DB transaction per business creation; provision lookups use indexed unique key on `snapshot_provisions`.
- Large JSON assets are stored once per snapshot row; context API returns only UI-facing slices (not full CRM/email bodies).
- Session storage avoids navigation flash on hard refresh within the same tab session.

---

## Security Notes

- Platform snapshot mutations require platform role guard + `platform.snapshots.manage` (frontend permission alignment in `permissions.ts` / legacy map).
- Business context endpoint is read-only and scoped to the authenticated member’s `businessId`.
- Apply and publish paths validate assets before persistence; unknown routes/icons/widgets are rejected at validation.
- Published snapshot required for business registration/creation — prevents provisioning from draft/archived templates.
- Soft-deleted snapshots excluded from context resolution; FK on business `snapshotId` uses `ON DELETE SET NULL`.
- Snapshot apply does not exfiltrate or copy data across businesses; provisions are always scoped by `businessId`.

---

## Remaining Future Work

- **Re-apply / migration tooling**: UI and policies for safely changing a live business’s snapshot (partial re-provision vs full reset).
- **Snapshot versioning**: Immutable published versions with upgrade path instead of in-place `updatedAt` context version.
- **Industry ↔ snapshot mapping**: Automatic snapshot suggestion from industry selection on register.
- **Integration assets**: Turn `integrations.recommended` into guided setup wizards.
- **Expanded asset types**: Work item templates, payment defaults, custom fields in snapshots.
- **E2E tests**: Playwright flows for register-with-snapshot and platform publish/apply.
- **Migration hygiene**: Run `generate-snapshot-migration.mjs` in CI when seed definitions change to prevent SQL drift.
- **Observability**: Metrics on apply duration and provision failure rates per asset type.

---

## Completion Notes (agent pass)

- Removed duplicate migration directory `20260607120000_snapshot_system`; canonical migration is `20260607120000_snapshots_system`.
- Verified `seed.ts` upserts all `SNAPSHOT_SEED_DEFINITIONS` as `PUBLISHED`.
- Verified `AuthService` and `BusinessService` delegate provisioning to `SnapshotApplyService` only.
- Fixed `snapshot-apply.service.spec.ts` to mock `tx.snapshotProvision.findUnique` (aligned with transactional idempotency implementation).
