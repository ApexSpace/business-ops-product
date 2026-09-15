# Feature runbook: Payments and Stripe Connect

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

---

## 1. Purpose / user-facing surface

Collect and manage business payments (transactions, refunds, collect flows), connect Stripe accounts (payment-account settings, test/live mode), public pay links, platform payments hub.

---

## 2. Current implementation map

| Layer | Path |
|-------|------|
| Payments domain | `backend/libs/modules/finance/payments/` |
| Stripe Connect / account settings | `backend/libs/modules/integrations/integrations/stripe/` |
| Platform Stripe billing (SaaS) | `backend/libs/modules/platform/billing/stripe/` (subscription — see platform billing runbook) |
| Controllers | `payments`; `payment-accounts/primary`, `payment-accounts/payments-mode`; Stripe onboarding/dashboard links; `webhooks/stripe`; `platform/payments` |
| Frontend | `frontend/features/payments/`, `frontend/features/payment-accounts/` |
| App routes | `business/payments`; `business/settings/payment-account`; public `payment/[token]`, `pay/invoice/[token]`; `platform/payments` |
| Prisma | `Payment`, `ContactStripeCustomer`, `ContactPaymentMethod`, `ContactWalletBalance`, `ContactWalletTransaction` |
| Payable registry | handlers under `finance/payments/handlers/` (invoice, booking deposit, form, etc.) |

---

## 3. Public vs authenticated APIs

- Authenticated: list/collect/refund business payments; configure payment accounts.
- Public: pay-by-token flows.
- Webhooks: Stripe Connect + platform webhooks (signature-verified).

---

## 4. Permissions / capabilities

- Module: `payments` (`transactions.*`, `refund`, `collect`).
- `@RequireModule('payments')` on payments controllers.
- Staff: `payments.access`, `payments.manage`.

---

## 5. Cross-feature dependencies

- Invoices / sales checkouts, public booking deposits, form payments.
- Integrations Stripe OAuth/Connect onboarding.
- Contacts for customer/payment method linkage.

---

## 6. Patterns to copy

- New payable type: register handler in payable registry (see existing invoice/form handlers).
- FE collection: `features/payments/api/payment-collection.api.ts`.
- Account UI: `features/payment-accounts/`.

---

## 7. Do-not / pitfalls

- Never put live secret keys in Cloud Agent secrets casually; prefer test mode.
- Distinguish **platform SaaS billing** Stripe vs **connected account** Stripe for tenants.
- Dual test/live mode utilities under stripe mode helpers — follow existing `stripe-mode.util` patterns.
- Webhooks must stay idempotent.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=payment
```

Manual: Connect test Stripe account → collect test payment on invoice/form → confirm Payment row + webhook.

---

## 9. Related docs

- [forms.md](../communications/forms.md)
- [invoices-estimates.md](./invoices-estimates.md)
- [oauth-integrations.md](../integrations/oauth-integrations.md)
- [billing-snapshots-admin.md](../platform/billing-snapshots-admin.md)
- [INDEX](../../INDEX.md)
