# Frontend architecture

This app uses a **feature-first** layout. Domain logic lives under `features/`; `app/` holds thin Next.js routes.

## Top-level directories

| Path | Purpose |
|------|---------|
| `app/` | Next.js route segments + BFF (`app/api/*`) — thin pages only. |
| `features/<domain>/` | Domain source of truth: `api/`, `types/`, `schemas/`, `utils/`, `hooks/`, `pages/`, `components/`. |
| `components/` | Shared UI (data-display, forms, layout, shell) — no domain API calls. |
| `lib/` | All cross-cutting infrastructure (auth, API, query, runtime, config, hooks, forms, UI helpers, shared DTO barrels). |
| `docs/` | Frontend standards and architecture notes. |
| `public/`, `scripts/` | Static assets and build scripts. |

There is no top-level `hooks/`, `config/`, or `types/` — those live under `lib/`.

## `lib/` layout

```
lib/
  api/                    # client, envelope, server, errors, pagination
  auth/                   # JWT helpers, cookies, session, provider, refresh
  query/                  # query keys + invalidation helpers
  runtime/                # providers, navigation loading, page metadata, routing
  config/                 # env, menus, geo options, feature flags, industry labels
    navigation/           # business-menu, platform-menu, business-settings-menu
  hooks/                  # generic hooks (list URL params, debounce, mobile, app router)
  forms/                  # field errors, idempotency, phone, filter-select, zod-required
  ui/                     # control-styles, relative-time
  observability/          # sentry, web-vitals
  types/                  # shared DTO barrels (api.ts legacy, shared.ts, shell-nav.ts)
  utils.ts                # cn() — kept at root (shadcn convention)
```

Domain dropdown data lives under `features/*/utils/select-options.ts` and `lib/config/geo-options.ts`, not at the frontend root.

## Import examples

| Need | Import |
|------|--------|
| Auth context | `@/lib/auth/provider` (`useAuth`, `AuthProvider`) |
| JWT / context labels | `@/lib/auth` or `@/lib/auth/auth` |
| Cookies (BFF) | `@/lib/auth/cookies`, `@/lib/auth/session` |
| Query keys | `@/lib/query/keys` |
| Invalidate lists | `@/lib/query/invalidation` |
| App providers | `@/lib/runtime/providers` |
| Navigation loading | `@/lib/runtime/navigation-loading` |
| Post-login routing | `@/lib/runtime/routing` |
| Backend URL (BFF) | `@/lib/config/env` |
| Menus | `@/lib/config/navigation/business-menu`, etc. |
| Generic hooks | `@/lib/hooks/use-list-search-params`, `@/lib/hooks/use-debounced-value` |
| Phone helpers | `@/lib/forms/phone` |
| Control sizing | `@/lib/ui/control-styles` |
| `cn()` | `@/lib/utils` |
| Lead status options | `@/features/leads/utils/select-options` |
| Country / timezone | `@/lib/config/geo-options` |

## Import rules

- **API calls:** `features/<domain>/api/*.api.ts` only (not `@/lib/api/client` from pages/components).
- **Domain schemas/utils:** `@/features/<domain>/schemas|utils|workspace/...` — domain code must not live under `lib/`.
- **BFF / server API:** `@/lib/api/envelope`, `@/lib/api/server`.
- **Permissions:** `@/features/auth/permissions` (`PERMISSIONS`, `useCan`, `Can`).
- **Types:** `@/features/<domain>/types` for domain code; `@/lib/types/shared` for auth/session DTOs.

## Feature page pattern

```tsx
// app/(business)/business/leads/page.tsx
"use client";
import { LeadsPage } from "@/features/leads/pages/leads-page";
export default function Page() {
  return <LeadsPage />;
}
```

Platform list routes follow the same pattern under `features/platform/pages/`.

## Related docs

- `docs/api-standards.md` — BFF and envelope conventions (if present in repo).
- `docs/ui-standards.md` — shared UI patterns (if present).
