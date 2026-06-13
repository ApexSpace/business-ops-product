# AGENTS.md — Business Automation Application

Guidance for AI agents and contributors working in this monorepo. Read this before adding or changing features.

## Project overview

Multi-tenant business automation platform: CRM, communications, finance, operations, integrations, and platform admin.

| Area | Stack | Port (dev) |
|------|-------|------------|
| **Backend** | NestJS 11, Prisma, PostgreSQL, Redis, BullMQ | API `3000` |
| **Frontend** | Next.js 16 (App Router), React 19, TanStack Query, Zod, Tailwind | `3001` |
| **Mobile** | Expo / React Native, Expo Router | Expo dev server |
| **Shared** | `@business-automation/api-contract` (OpenAPI codegen) | — |

### Repository layout

```
/
├── backend/          # NestJS monorepo (api, worker, scheduler apps)
│   ├── apps/         # api | worker | scheduler entrypoints
│   ├── libs/
│   │   ├── common/   # guards, decorators, interceptors, shared DTOs
│   │   ├── core/     # prisma, redis, queue, storage, realtime, jobs
│   │   └── modules/  # domain modules (see below)
│   └── prisma/       # schema + migrations
├── frontend/         # Next.js web app
│   ├── app/          # routes only — thin pages, delegate to features
│   ├── features/     # domain UI, hooks, API, schemas
│   ├── components/   # shared UI (shadcn-style primitives)
│   └── lib/          # api client, query keys, auth, utils
├── mobile/           # Expo app (subset of features; same backend)
└── packages/
    └── api-contract/ # generated types from backend OpenAPI
```

### Backend domain modules

Modules live under `backend/libs/modules/` and are grouped into API bundles:

- **crm** — contacts, leads, pipelines, notes, services, industries
- **communications** — conversations, messages, email, forms, chatbots
- **finance** — invoices, estimates, payments
- **operations** — appointments, calendars, tasks, public booking
- **integrations** — OAuth providers, webhooks, resource sync
- **platform** — auth, business, membership, capabilities, snapshots, audit, files

Each domain typically has: `controllers/`, `services/`, `repositories/`, `dto/`, `mappers/`, `utils/`, and a `*.module.ts`. Register new modules in the parent bundle (e.g. `crm.module.ts`) and ensure the bundle is imported by the correct app (`*-api.module.ts`, `*-worker.module.ts`).

---

## Local development

```bash
# From repo root
npm install

# Redis (required for queues / realtime)
npm run redis:up

# Backend API + worker
npm run dev:backend

# Frontend (waits for API on :3000)
npm run dev

# Or run individually
npm run dev:api
npm run dev:worker
npm run dev:frontend

# Mobile
npm run dev:mobile
```

Backend env: `backend/.env` (database, Redis, JWT, third-party keys). Frontend proxies API calls through `/api/backend/*` — do not call the Nest API directly from browser code.

---

## General principles

1. **Minimize scope** — Smallest correct change. Do not refactor unrelated code.
2. **Follow existing patterns** — Copy a nearby feature (contacts, leads, forms) before inventing new structure.
3. **Business scoping** — Almost all data is scoped to `businessId` from the authenticated user. Never trust client-supplied business IDs.
4. **Soft deletes** — Repositories filter `deletedAt: null` on reads unless explicitly dealing with trash/archive.
5. **Audit logging** — Mutations that change business data should call `AuditService.log()` (see contacts service).
6. **Response envelope** — API responses are wrapped as `{ data, meta, error }`. Clients use `parseEnvelope` / `parsePaginated` — return `{ items, meta }` from list endpoints in services.
7. **Errors** — Backend: throw `AppException` with `ErrorCode`. Frontend: surface via `ApiClientError` and toast where appropriate.
8. **No secrets in git** — Never commit `.env`, tokens, or credentials.

---

## Adding a backend feature

Use this checklist when introducing a new resource or endpoint group.

### 1. Data model (if needed)

1. Edit `backend/prisma/schema.prisma`.
2. Create migration: `npm run db:migrate --prefix backend`.
3. Run `npm run db:generate --prefix backend` if needed.

Prefer additive migrations. Include indexes for foreign keys and common filters (`businessId`, `deletedAt`, search fields).

### 2. Module structure

Create a folder under the correct domain, e.g. `backend/libs/modules/crm/widgets/`:

```
widgets/
├── controllers/widgets.controller.ts
├── services/widgets.service.ts
├── repositories/widget.repository.ts
├── dto/
│   ├── create-widget.dto.ts
│   ├── update-widget.dto.ts
│   ├── list-widgets-query.dto.ts
│   └── widget-response.dto.ts
├── mappers/widget.mapper.ts      # Prisma entity → response DTO
├── utils/                        # domain helpers (optional)
└── widgets.module.ts
```

Wire into parent module (`crm.module.ts`) and export if other modules need it.

### 3. Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Controller** | HTTP mapping, guards, Swagger tags, parse params (`ParseUUIDPipe`), delegate to service |
| **Service** | Business rules, validation, orchestration, audit logs, job enqueue |
| **Repository** | Prisma queries only; `businessId` scoping; no HTTP concepts |
| **DTO** | `class-validator` + `@nestjs/swagger` decorators on inputs |
| **Mapper** | Shape DB models into stable response DTOs |

### 4. Controller conventions

```typescript
@ApiTags('widgets')
@ApiBearerAuth()
@Controller('widgets')
@UseGuards(BusinessRolesGuard)           // always for business routes
// @UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)  // if feature-gated
export class WidgetsController {
  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN, BusinessMemberRole.MEMBER)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWidgetDto) {
    return this.widgetsService.create(user.businessId!, dto, user);
  }
}
```

- Use `@Public()` only for unauthenticated routes (auth, webhooks, public booking, etc.).
- Pass `user.businessId!` into services — services never read business ID from the body.
- Destructive deletes: accept `ConfirmDeleteQueryDto` (`?confirm=true`).
- List endpoints: return `{ items, meta: { total, page, limit } }`.

### 5. DTO validation

- Input DTOs: `class-validator` decorators (`@IsUUID`, `@MaxLength`, `@IsOptional`, …).
- Extend shared profile DTOs when fields repeat (see `ContactProfileDto`).
- Query DTOs for pagination: extend or mirror `ListContactsQueryDto` patterns.
- Document with `@ApiProperty` / `@ApiPropertyOptional` for OpenAPI.

### 6. Service conventions

- Throw `AppException` with appropriate `HttpStatus` and `ErrorCode` for domain failures.
- Call `auditService.log({ actorUserId, businessId, action, entityType, entityId })` on create/update/delete.
- Use `getPaginationParams(query)` for list endpoints.
- Enqueue async work via `JobEnqueueService` — do not run long IO in the request thread.

### 7. Repository conventions

- Inject `PrismaService`.
- Private `activeWhere(businessId, extra?)` helper including `deletedAt: null`.
- Use `findFirst` with `businessId` — never `findUnique` on id alone.
- Keep includes typed with `satisfies Prisma.XInclude`.

### 8. Register the module

1. Add to domain `*.module.ts` (e.g. `crm.module.ts`).
2. Confirm `*-api.module.ts` imports the domain bundle (usually already does).
3. If background processing is needed, register processors in `*-worker.module.ts`.

### 9. Tests

- Unit tests: `*.spec.ts` next to the file under test (`jest` in `backend/`).
- Test services and utils with mocked repositories.
- Run: `npm test --prefix backend`.

### 10. OpenAPI / API contract

After API changes:

```bash
npm run openapi:export --prefix backend   # writes backend/openapi.json
npm run codegen --workspace=@business-automation/api-contract
```

Prefer generated types in clients over hand-maintained duplicates.

---

## Adding a frontend feature

Use this checklist for new UI or API consumption in the web app.

### 1. Feature folder

Create `frontend/features/<domain>/` mirroring an existing feature:

```
features/widgets/
├── api/widgets.api.ts          # thin wrappers around lib/api/client
├── hooks/
│   ├── use-widgets-list.ts
│   ├── use-widget-detail.ts
│   └── use-widget-mutations.ts
├── schemas/widget-profile.ts   # Zod schemas + form defaults + mappers
├── components/                 # presentational + containers
├── types/index.ts              # domain types (or import from api-contract)
└── utils/                      # display/format helpers (optional)
```

### 2. API layer

- **Do not** import `@/lib/api/client` from `app/` or `components/` — ESLint enforces this.
- Domain API files call `api.get`, `api.post`, `api.patch`, `api.delete`, `api.getPaginated`:

```typescript
// features/widgets/api/widgets.api.ts
import { api } from "@/lib/api/client";

export function listWidgets(filters: WidgetsListFilters = {}) {
  return api.getPaginated<Widget>("widgets", { searchParams: filters });
}
```

- Paths are relative to the backend proxy (no leading `/api/backend`).
- Use typed request/response bodies; prefer `@business-automation/api-contract` when codegen is available.

### 3. React Query

- **Query keys**: add entries to `frontend/lib/query/keys.ts` using the `listKey()` helper for filtered lists.
- **Invalidation**: add helpers to `frontend/lib/query/invalidation.ts` (invalidate list + detail + picker as needed).
- **Hooks**: colocate `useQuery` / `useMutation` in `hooks/`; mutations should invalidate queries and show `toast` on success/error.
- Pattern: `use-widgets-list.ts` for reads, `use-widget-mutations.ts` for writes.

### 4. Forms

- Define Zod schemas in `schemas/` (e.g. `widget-profile.ts`).
- Use `react-hook-form` + `zodResolver`.
- Export: schema, `FormValues` type, defaults, and `formToApiBody` / `entityToForm` mappers.
- Use shared `Form` components from `@/components/ui/form` where applicable.
- Required field markers: `isZodFieldRequired` from `@/lib/forms/zod-required`.

### 5. Pages and routing

- Routes live in `frontend/app/` — keep pages thin.
- Business app routes: `app/(business)/business/...`
- Platform admin: `app/(platform)/platform/...`
- Public routes: `app/book/`, `app/invoice/`, `app/widget/`, etc.
- Page file imports a screen/component from `features/` and passes route params.
- Add `loading.tsx` / `error.tsx` alongside data-heavy routes when appropriate.

### 6. Permissions and capabilities

- UI gating: `useCan(PERMISSIONS["..."])` from `@/features/auth/permissions`.
- Add new permissions to `permissions.ts` and `evaluatePermission()` if needed.
- Backend capability-gated features should hide/disable UI when the business lacks the capability (listen for `feature-unavailable` events from the API client classifier).

### 7. Styling and components

- Tailwind CSS 4; use `cn()` from `@/lib/utils`.
- Reuse primitives from `frontend/components/ui/` (Button, Card, Dialog, etc.).
- Feature-specific components stay in `features/<domain>/components/`.
- File names: **kebab-case** (`widget-list-item.tsx`).

### 8. Realtime (if applicable)

- Business events: `useBusinessEvents` from `@/features/realtime`.
- Invalidate relevant query keys on event receipt — do not mutate cache blindly.

### 9. Tests

- Unit: Vitest (`npm test --prefix frontend`) — utils, schemas, permissions.
- E2E: Playwright (`npm run test:e2e --prefix frontend`) for critical flows.

---

## Adding a mobile feature

Mobile mirrors the frontend feature architecture under `mobile/src/features/`:

```
src/features/<domain>/
├── api/<domain>.api.ts     # uses mobile/src/lib/api/client (direct backend URL)
├── hooks/
├── components/
├── screens/
├── schemas/
└── types/
```

- Routing: Expo Router in `mobile/app/`.
- Auth: token store + session bridge (`mobile/src/lib/auth/`).
- Reuse backend endpoints and response shapes from the web app.
- Shared types: prefer `@business-automation/api-contract` when codegen is wired.
- See `mobile/CLAUDE.md` which references this file.

---

## Cross-cutting concerns

### Authentication

- **Backend**: global `JwtAuthGuard`; `@Public()` opts out. `@CurrentUser()` provides `RequestUser` with `id`, `businessId`, roles.
- **Frontend**: session cookies via Next.js routes (`app/api/auth/*`); API proxy attaches credentials.
- **Mobile**: Bearer tokens stored in secure storage.

### Idempotency

`IdempotencyMiddleware` is applied globally. Mutations that create side effects can accept an idempotency key — frontend `api` client supports `idempotencyKey` in options.

### Background jobs

- Enqueue in services: `JobEnqueueService`.
- Process in **worker** app: BullMQ processors under `workers/processors/`.
- Do not run webhook handling, email sends, or heavy sync in the API request cycle.

### Capabilities (feature flags per business)

Some modules use `BusinessCapabilityGuard` in addition to role guards. When adding a gated feature:

1. Register capability in platform capabilities registry.
2. Guard backend routes.
3. Handle `FEATURE_UNAVAILABLE` on the frontend.

### Soft delete and confirm delete

- Repository: set `deletedAt` instead of hard delete unless explicitly required.
- Delete endpoints: require `?confirm=true` query param.

---

## Naming conventions

| Context | Convention | Example |
|---------|------------|---------|
| Backend files | kebab-case | `create-contact.dto.ts` |
| Backend classes | PascalCase | `CreateContactDto` |
| API routes | kebab-case plural | `contact-tags`, `work-items` |
| Frontend files | kebab-case | `contact-list-item.tsx` |
| React components | PascalCase | `ContactListItem` |
| Hooks | camelCase `use*` | `useContactsList` |
| Query keys | camelCase nested | `queryKeys.contacts.detail(id)` |
| Audit actions | dot notation | `contact.created` |
| Prisma models | PascalCase singular | `Contact` |

---

## What to avoid

- Importing `@/lib/api/client` directly in Next.js `app/` or shared `components/` pages.
- Putting business logic in controllers or repositories.
- Skipping `businessId` filters in Prisma queries.
- Hand-maintaining DTO types that exist in `@business-automation/api-contract`.
- Large drive-by refactors when fixing a bug or adding a small feature.
- Committing `.env` files or API keys.
- Creating empty commits or unrelated documentation files unless asked.

---

## Pre-merge checklist

### Backend change

- [ ] Prisma migration created and applies cleanly (if schema changed)
- [ ] Module registered in parent + correct app bundle (api/worker)
- [ ] DTOs validated; Swagger decorators present
- [ ] `businessId` scoping on all queries
- [ ] Audit log on mutations (where applicable)
- [ ] `*.spec.ts` added/updated for non-trivial logic
- [ ] OpenAPI export + codegen run (if public API shape changed)

### Frontend change

- [ ] Feature code under `features/<domain>/`, not bloating `app/`
- [ ] Query keys + invalidation helpers updated
- [ ] Permissions/capabilities respected in UI
- [ ] Forms use Zod + react-hook-form pattern
- [ ] No direct `api/client` imports outside feature `api/` and `hooks/`
- [ ] `npm run lint --prefix frontend` passes

### Mobile change

- [ ] Parity with web API shapes
- [ ] Token refresh path still works
- [ ] Screen registered in Expo Router

---

## Useful commands

```bash
# Backend
npm run lint --prefix backend
npm test --prefix backend
npm run db:studio --prefix backend
npm run db:seed --prefix backend

# Frontend
npm run lint --prefix frontend
npm test --prefix frontend
npm run codegen:api --prefix frontend

# Full stack from root
npm run dev
```

---

## Reference implementations

When unsure, copy patterns from these well-established features:

| Concern | Backend | Frontend |
|---------|---------|----------|
| CRUD resource | `crm/contacts` | `features/contacts` |
| Pipeline / stages | `crm/pipelines` | `features/pipelines` |
| Complex forms | `communications/forms` | `features/forms` |
| Public unauthenticated API | `operations/public-booking` | `features/public-booking` |
| OAuth / webhooks | `integrations/integrations` | `features/integrations` |
| Capability-gated | `communications/forms` | `features/forms` |
| Background jobs | `communications/email/workers` | — |
