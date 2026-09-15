# Feature runbook: Invoices, estimates, and sales checkout

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Create/manage invoices and estimates; sales/checkout flow for collecting payment on invoices; public invoice/estimate token pages.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Backend | `backend/libs/modules/finance/invoices/` (includes **checkouts**), `backend/libs/modules/finance/estimates/` |
| Controllers | `invoices`; `public/invoices`; `checkouts`; `estimates` |
| Frontend | `frontend/features/invoices/`, `estimates/`, `sales/` |
| App routes | `business/invoices`, `business/estimates`, `business/sales`; public `invoice/[token]`, `estimate/[token]` |
| Prisma | `Invoice`, `InvoiceItem`, `Estimate`, `EstimateItem` |

There is **no** separate `finance/sales` Nest module — sales UI uses checkout APIs under invoices.

---

## 3. Public vs authenticated APIs

- Authenticated CRUD for invoices/estimates/checkouts.
- Public token-based **invoice** views and payment entry points.
- **C-P0-01 waived for launch:** public `estimate/[token]` is an unavailable state. There is no public estimate API. Do not send clients public estimate links.

---

## 4. Permissions / capabilities

- Modules: `invoices`, `estimates`, `sales`.
- Staff: `sales.*` and related finance access keys.
- Routes include `/business/sales` in capability route maps.

---

## 5. Cross-feature dependencies

- Payments / Stripe for collection.
- Contacts for bill-to.
- Products/services/line items; custom fees / checkout-advanced settings may apply at checkout.
- Packages/gift cards/memberships may appear as line sources depending on flow.

---

## 6. Patterns to copy

- Line items UI patterns in estimate/invoice form components.
- Stripe invoice payment service under invoices services.
- Sales drawer tokens must not fork design system — use shared drawer recipes (`frontend/REUSE.md`).

---

## 7. Do-not / pitfalls

- Do not create a parallel “Sales” Prisma model unless product explicitly adds one — today sales = checkout on invoices.
- Public token routes must remain `@Public()` and authorization via token secrecy.
- Keep OpenAPI + codegen in sync when DTO shapes change.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=invoice
npm test --prefix backend -- --testPathPattern=estimate
```

Manual: create estimate → convert/create invoice → checkout → pay in test mode.

---

## 9. Related docs

- [payments-and-stripe.md](./payments-and-stripe.md)
- [catalog-commerce.md](./catalog-commerce.md)
- [INDEX](../../INDEX.md)
