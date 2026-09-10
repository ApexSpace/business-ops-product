# Feature runbook: Forms (builder + public)

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Businesses build forms (settings), embed/public widgets collect submissions; optional payment collection on forms; platform admin has forms metadata/hub surfaces including platform payments hub.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `backend/libs/modules/communications/forms/` |
| Controllers | `forms` (business); `public/forms`; `widgets`; `forms/metadata`; `platform/forms*`; `platform/payments` (payments hub) |
| Frontend | `frontend/features/forms/`, `frontend/features/public-forms/`, platform payments under `frontend/features/platform/` |
| App routes | `business/settings/forms/**`; `platform/forms/**`; public `widget/form/[publicKey]` |
| Prisma | `Form`, `FormSubmission`, `FormPaymentAttempt` |

Field registry: `forms/registries/form-field.registry.ts`. Collect-payment helpers under `forms/utils/` + finance payable handler for forms.

---

## 3. Public vs authenticated APIs

- Authenticated: CRUD templates/submissions for business + platform.
- Public: `@Public()` submit / load by public key (`public/forms`).
- Payments: payment intent flows tied to form submissions (Stripe Connect path via finance payments).

---

## 4. Permissions / capabilities

- Module: `forms` (capability-gated business forms).
- Staff: `forms.view_*`, `forms.manage_templates`.
- Guards: `BusinessCapabilityGuard` / `@RequireModule` patterns as on business forms controllers.

---

## 5. Cross-feature dependencies

- Contacts/leads may be created or linked on submit (check current mapping services).
- Payments / Stripe Connect for paid forms.
- Storage if file fields upload assets.

---

## 6. Patterns to copy

- Field types: `frontend/features/forms/constants/form-field-type-keys.constant.ts` + schema.
- Builder: `features/forms/components/builder/*`.
- Runtime: `form-runtime-view.tsx` / public widget.

---

## 7. Do-not / pitfalls

- Do not bypass field registry when adding field types (BE + FE must stay in sync).
- Public submit must not trust client `businessId`.
- Payment fields require payments module + connected Stripe account readiness.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=forms
npm test --prefix frontend -- forms
```

Manual: open builder → publish → submit via public widget → see submission.

---

## 9. Related docs

- [payments-and-stripe.md](../finance/payments-and-stripe.md)
- [AGENTS.md](../../../AGENTS.md) (capability-gated reference)
- [INDEX](../../INDEX.md)
