# Snapshot UX Redesign Report

Business-friendly, non-technical Snapshot CRUD for the Business Automation Application platform admin. Slug was **not** reintroduced; snapshots are identified by **name + id** only.

---

## 1. Creation Wizard

**Component:** `frontend/features/platform/components/create-snapshot-wizard.tsx`

Replaced the single-field create dialog with a 4-step wizard:

| Step | Content |
|------|---------|
| 1 | Name + Description |
| 2 | Starting point: Blank / Default Business Snapshot / Clone existing (searchable list) |
| 3 | Experience presets: terminology set, navigation set, dashboard preset |
| 4 | Review summary → Create → navigate to editor |

Presets live in `frontend/features/platform/utils/snapshot-presets.ts`.

---

## 2. Editor Layout Redesign

**Page:** `frontend/features/platform/pages/platform-snapshot-detail-page.tsx`

Three-column layout (responsive):

- **Left sidebar:** section navigation (`editor-sidebar.tsx`)
- **Main:** active structured builder
- **Right:** live preview panel (`snapshot-preview-panel.tsx`) — hidden on Preview / Validation / Advanced tabs
- **Top bar:** publish status, unsaved indicator, Save, Publish (`editor-top-bar.tsx`)

Mobile: section picker via `SearchableSelect`.

---

## 3. Terminology Builder

**Component:** `snapshot-builders/terminology-builder.tsx`

- Table: Label, Current Value, Default Value, Reset per row
- Search + category filters (navigation, entities, actions, other)
- Bulk “Reset all to defaults”

---

## 4. Navigation Builder

**Component:** `snapshot-builders/navigation-builder.tsx`

- Available vs selected pages
- Drag reorder via `@dnd-kit` (`sortable-list.tsx`)
- Visibility toggle, icon selector (`icon-registry`), route selector (`route-registry`)
- Grouped UX: menu editor + available pages card

---

## 5. Dashboard Builder

**Component:** `snapshot-builders/dashboard-builder.tsx`

- Widget cards from `widget-registry` with show/hide toggles
- Drag reorder for enabled widgets

---

## 6. CRM Defaults Builder

**Component:** `snapshot-builders/crm-builder.tsx`

- Pipeline cards with stages table (add/remove stages, stage type)
- Services table
- Tags with color picker

---

## 7. Calendars Builder

**Component:** `snapshot-builders/calendars-builder.tsx`

- Card-based editor per calendar template
- Name + availability template JSON per calendar

---

## 8. Chatbots Builder

**Component:** `snapshot-builders/chatbots-builder.tsx`

- Visual name field per chatbot
- Rules table: trigger phrase + response

---

## 9. Emails Builder

**Component:** `snapshot-builders/emails-builder.tsx`

- Notification type list with enable/disable toggles
- Subject + HTML body editor per type
- Variable hint badges + preview with sample data

---

## 10. Branding Builder

**Component:** `snapshot-builders/branding-builder.tsx`

- Product name, accent color, logo URL, public page title
- Live public booking header preview

---

## 11. Preview Center Tab

**Component:** `snapshot-builders/preview-center-builder.tsx`

Dedicated tab showing sidebar preview, dashboard widgets, terminology examples, booking header mockup, and first chatbot rules.

---

## 12. Validation Center

**Component:** `snapshot-builders/validation-center-builder.tsx`  
**Logic:** `frontend/features/platform/utils/snapshot-validation.ts`

- Client-side checks aligned with backend rules (routes, icons, widgets, email types, pipeline stages, name length)
- Success / warning / error checklist
- Publish blocked on critical errors only
- Publish calls backend `POST /platform/snapshots/:id/publish`

---

## 13. Advanced Mode Tab

**Component:** `snapshot-builders/advanced-builder.tsx`

- Warning banner for non-technical users
- JSON textarea with format, copy, export, import
- “Apply JSON to editor” syncs into shared `assets` state (bidirectional with structured builders)

---

## 14. Apply Snapshot UX

**Component:** `frontend/features/platform/components/apply-snapshot-dialog.tsx`

- Select business
- Current vs target snapshot comparison panel
- Warning about provisioning vs overwriting
- Two-step confirm flow
- Result summary via toast with description

---

## 15. Clone UX

**Component:** `frontend/features/platform/components/clone-snapshot-dialog.tsx`

- Row action “Clone” opens modal with **New snapshot name** only (no slug)
- Clone API + PATCH name → redirect to editor

---

## 16. Empty State

**Page:** `platform-snapshots-page.tsx`

- Title: “No snapshots yet”
- Description explaining blueprints
- Actions: Create (wizard) + disabled Clone hint until snapshots exist

---

## 17. Performance & Architecture

**Hook/Context:** `frontend/features/platform/hooks/use-snapshot-editor.tsx`

- Single `assets` object as source of truth in React state
- Dirty tracking vs last saved fingerprint
- Explicit Save (PATCH merged assets + overview)
- Publish with pre-validation; auto-save-before-publish when dirty
- Editor loads **full assets** via `GET /platform/snapshots/:id` (platform admin only)
- Business app **unchanged** — still uses lightweight `snapshot-context` only

**Builder directory:** `frontend/features/platform/components/snapshot-builders/`

| File | Purpose |
|------|---------|
| `editor-sidebar.tsx` | Left nav |
| `editor-top-bar.tsx` | Top bar |
| `editor-section-content.tsx` | Section router |
| `sortable-list.tsx` | Shared dnd-kit list |
| `overview-builder.tsx` | Overview |
| `terminology-builder.tsx` | Terminology |
| `navigation-builder.tsx` | Navigation |
| `dashboard-builder.tsx` | Dashboard |
| `crm-builder.tsx` | CRM |
| `calendars-builder.tsx` | Calendars |
| `chatbots-builder.tsx` | Chatbots |
| `emails-builder.tsx` | Emails |
| `branding-builder.tsx` | Branding |
| `integrations-builder.tsx` | Integrations |
| `preview-center-builder.tsx` | Preview tab |
| `validation-center-builder.tsx` | Validation tab |
| `advanced-builder.tsx` | Advanced JSON |

**Supporting utilities:**

- `frontend/features/platform/utils/snapshot-presets.ts` — wizard presets
- `frontend/features/platform/utils/snapshot-validation.ts` — client validation

**Removed:** `create-snapshot-dialog.tsx` (replaced by wizard)

---

## 18. Testing

- `npm test` (frontend vitest): **30/30 passed**
- `npx tsc --noEmit`: **clean**

Existing snapshot resolution tests unchanged; business snapshot context path untouched.

---

## API Surface (unchanged endpoints)

| Method | Path | Usage |
|--------|------|-------|
| GET | `/platform/snapshots` | Library list |
| GET | `/platform/snapshots/:id` | Editor load (full assets) |
| POST | `/platform/snapshots` | Wizard create |
| PATCH | `/platform/snapshots/:id` | Save |
| POST | `/platform/snapshots/:id/publish` | Publish |
| POST | `/platform/snapshots/:id/clone` | Clone |
| POST | `/platform/snapshots/:id/apply` | Apply to business |

No slug field anywhere in the UX or API payloads.
