# Feature runbook: Platform billing, snapshots, data-io, trial, jobs, audit, admin UI

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

SaaS subscription billing for businesses; snapshot provision; data import/export; trial signup handoff; async jobs; audit logs; platform dashboard/settings/operations admin screens.

---

## 2. Current implementation map

| Area | Backend | Frontend | Notes |
|------|---------|----------|-------|
| Billing | `platform/billing/stripe` | platform + `business/settings/billing` | Platform Stripe **≠** Connect payments |
| Snapshots | `platform/snapshots` | `features/platform` | `platform/snapshots` |
| Data IO | `platform/data-io` | `data-io` | `data-io/entities`, `data-imports*` |
| Trial | `platform/trial-signup` | `trial-signup` | `auth/trial`, public trial; `auth/trial-handoff`, `widget/trial` |
| Jobs | `platform/jobs` | platform | `jobs` |
| Audit | `platform/audit` | platform | `platform/audit-logs`, business-scoped audit |
| Platform hub | `platform/platform`, `platform/operations` | `features/platform` | dashboard, settings, operations |

**Prisma:** `BusinessSubscription*`, `BusinessStripeCustomer`, `BusinessPaymentMethod`, `Snapshot`, `SnapshotProvision`, `DataImportJob`, `TrialSignupSession`, `AsyncJob`, `AuditLog`, `PlatformSetting`.

**App routes:** `platform/dashboard|businesses|users|snapshots|audit-logs|operations|settings|payments|…`; `business/settings/billing|data`.

---

## 3. Public vs authenticated APIs

- Trial and some auth handoff endpoints public.
- Platform admin requires platform membership/roles.
- Business billing settings for owners/admins.

---

## 4. Permissions / capabilities

- FE: `platform.billing|snapshots|capabilities|…manage`.
- Business settings roles for billing/data-io.
- Entitlements testing: `docs/platform-operations-testing.md`.

---

## 5. Cross-feature dependencies

- Capabilities/tiers/addons determine feature availability after billing changes.
- Snapshots may seed CRM/services data.
- Audit should be called from domain services (not only platform UI).

---

## 6. Patterns to copy

- Platform pages under `features/platform/pages/`.
- Snapshot validation utils/services.
- Stripe platform API service separate from Connect account settings.

---

## 7. Do-not / pitfalls

- Do not reuse Connect payment-account code for SaaS billing (or vice versa).
- Snapshot provision is destructive/sensitive — confirm delete patterns and validation.
- Jobs must be observable via jobs API; do not orphan BullMQ work.

---

## 8. Verify locally

Follow `docs/platform-operations-testing.md` for entitlement/campaign matrices.

```bash
npm test --prefix backend -- --testPathPattern=snapshot
```

---

## 9. Related docs

- [auth-business-capabilities.md](./auth-business-capabilities.md)
- [payments-and-stripe.md](../finance/payments-and-stripe.md)
- [docs/platform-operations-testing.md](../../../docs/platform-operations-testing.md)
- [INDEX](../../INDEX.md)
