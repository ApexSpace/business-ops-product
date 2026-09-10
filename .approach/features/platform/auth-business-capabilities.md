# Feature runbook: Auth, business, membership, capabilities, tiers, addons

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Login/session; current business profile; team membership; entitlement capabilities; plan tiers/addons/plan-groups (platform admin). Business members UI and platform users/businesses admin.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `platform/auth`, `platform/business`, `platform/membership`, `platform/capabilities`, `platform/tiers`, `platform/addons`, `platform/plan-groups` |
| Controllers | `auth`; `businesses`; `businesses/current/members`; `platform/businesses`, `platform/users`, `platform/capabilities`, `platform/tiers`, `platform/addons`, `platform/plan-groups` |
| Frontend | `frontend/features/auth/`; admin under `frontend/features/platform/`; team under `frontend/features/team/` |
| App routes | `(auth)/*`; `business/members`, `business/settings/team|billing|profile`; platform `businesses`, `users`, `capabilities`, `tiers`, `addons`, `plan-groups` |
| Prisma | `User`, `RefreshToken`, `Business`, `BusinessMembership`, `PlatformMembership`, capability grant models, `PlanGroup`, `PlanTier`, `TierVersion`, `Addon`, `BusinessAddon`, subscription models |

Capability registry: `platform/capabilities/registries/capability-module.registry.ts`.  
Staff permissions FE: `frontend/features/team/permissions/staff-permission-registry.ts`.  
Coarse UI: `frontend/features/auth/permissions/permissions.ts`.

---

## 3. Public vs authenticated APIs

- Auth endpoints partially `@Public()` (login, refresh, trial handoff).
- Business/platform admin authenticated with role guards.

---

## 4. Permissions / capabilities

- Platform FE: `PERMISSIONS["platform.*"]`.
- Capability admin defines module keys consumed by `@RequireModule` / `@RequireCapability` across the app.
- Business roles: OWNER / ADMIN / MEMBER patterns via `BusinessRolesGuard`.

---

## 5. Cross-feature dependencies

- Every gated feature module depends on capabilities/tiers.
- Billing subscriptions affect effective capabilities.
- Trial signup provisions businesses.

---

## 6. Patterns to copy

- Effective capabilities services under `platform/business`.
- Permission checks: `useCan(PERMISSIONS[...])` on FE.

---

## 7. Do-not / pitfalls

- Never trust client-supplied capability flags — evaluate server-side.
- Changing capability registry impacts many modules; update FE permissions in tandem.
- Soft-delete and membership scoping still apply to tenant data.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=capability
```

Manual matrix: `docs/platform-operations-testing.md`.

---

## 9. Related docs

- [docs/platform-operations-testing.md](../../../docs/platform-operations-testing.md)
- [billing-snapshots-admin.md](./billing-snapshots-admin.md)
- [INDEX](../../INDEX.md)
