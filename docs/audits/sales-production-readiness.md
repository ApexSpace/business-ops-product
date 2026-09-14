# Sales — production readiness audit

**Product:** PandaCue (`ApexSpace/business-ops-product`)  
**Branch audited:** `development` @ `b8107d4c`  
**Audit branch:** `agent/audit-sales-production`  
**Date:** 2026-09-14  
**Scope:** Sales / POS checkout only (`InvoiceKind.CHECKOUT` + collect/close/webhook). No application code changed.

**Note:** Audit-only. Do **not** promote Sales to `main` until P0s are fixed or explicitly waived.

---

## 1. Executive summary

**Verdict: Not ready** for promotion toward `main`.

Staff checkout create → line items → cash/gift-card/wallet close is structurally sound and tenant-scoped. Stripe Connect charges are created on the connected account, not platform SaaS billing. C-P1-06 (`@RequireModule('sales')` on custom-fees and checkout-advanced) is **already fixed** in code (test-pack CAP-09 docs are stale).

The blocker is **Connect webhook settlement**. HTTP 200 is returned before verify/persist, and the worker Redis idempotency claim is **not released on failure**. A blip while processing `payment_intent.succeeded` can leave a succeeded card charge with the sale still `OPEN` / payment `PENDING`. Stripe will not retry after 2xx; Bull retries are skipped as “duplicates.” That is lost payment state (P0). Related P1s (void with money, invoices status API mutating checkouts, retry-close creating a second PaymentIntent, refunds that do not resync the sale) would make a production incident worse.

---

## 2. Feature map

There is **no** Nest module named `sales`. Sales = checkout invoices + payments collect.

| Layer | Path / surface |
|---|---|
| BE checkouts | `backend/libs/modules/finance/invoices/controllers/checkouts.controller.ts` prefix `checkouts`; `CheckoutsService`; `CheckoutRepository` (`InvoiceKind.CHECKOUT`) |
| BE close / totals | `CheckoutsService.close` / `computeTotals`; `CustomFeeEvaluationService`; `CheckoutAdvancedSettingsService` asserts on close |
| BE completion | `CheckoutCompletionService.finalizeCheckoutIfPaid` (inventory, gift-card issue, package issue, membership redeem, offers, `closedAt`) |
| BE invoices (adjacent) | `invoices` CRUD + `PATCH :id/status`; list defaults to `InvoiceKind.STANDARD` |
| BE payments | `payments` controller; `PaymentOrchestratorService.collectPayment`; `InvoicePayableHandler` |
| BE catalog used at sale | products picker; gift-card / package line APIs; membership redeem **on finalize** if line metadata present |
| BE settings | `custom-fees` + `checkout-advanced-settings` — both `@RequireModule('sales')` |
| Stripe Connect | `StripePaymentIntentService.createForPayment` (`stripeAccount: connected`); `POST /webhooks/stripe/connect` vs `.../platform` |
| Platform billing (out of Sales path) | `StripePlatformWebhookHandlerService`; gated by `source === 'platform'` + `PLATFORM_SUBSCRIPTION_PURPOSE` |
| Jobs | `StripeWebhookProcessor` (BullMQ). `FinanceWorkerModule` is empty — sale finalize is request + webhook, not a finance cron |
| FE | `/business/sales` → `frontend/features/sales/components/sales-workspace.tsx`; APIs in `features/sales/api/checkouts.api.ts` |
| FE collect | `SaleClosePanel` → `closeCheckout` (`POST checkouts/:id/close`), **not** `POST payments/collect` |
| Guards | Checkouts: `@RequireModule('sales')` + `sales.checkout` / view keys. Payments collect: `@RequireModule('payments')` + `payments.manage`. Refund: `sales.refund` / `sales.refund_open` |

---

## 3. What was tested

| Kind | Command / route | Result |
|---|---|---|
| BE unit | `npx jest --testPathPatterns='invoice-payment-sync\|payment-orchestrator\|checkout-advanced-settings.service.spec\|custom-fees.service.spec\|custom-fee-calculations\|sales-staff-access\|invoices.service.spec\|stripe-webhook\|business-capability.guard.spec\|booking-link-sale'` | **10 passed, 1 failed** (43 tests: 42 pass, 1 fail). Failure: `stripe-webhook-dispatch.service.spec.ts` constructor arity (see SALE-AUD-08) |
| FE unit | `npx vitest run features/sales lib/capabilities/route-capability-map.test.ts` | **12 passed** (token lint + route map). No behavioral checkout tests |
| API smoke (local) | `GET /api/v1/health` | 200; database up |
| API smoke | Login `admin@example.com` → switch business `604bcce8-…` → `GET /checkouts`, `GET /custom-fees`, `GET /checkout-advanced-settings` | 200; module APIs reachable |
| API smoke | `POST /checkouts` (valid contact) | 201, `status=OPEN`, `isOpen=true`, `Sale #n` |
| API smoke | `PATCH /invoices/:checkoutId/status` `{ status: "VOID" }` | **200 VOID**; subsequent `GET /checkouts/:id` stayed VOID (SALE-AUD-03) |
| API smoke | `DELETE /checkouts/:id` with **no** `confirm=true` | **200 VOID** (SALE-AUD-02) |
| API smoke | `POST /checkouts/:id/close` empty sale | 400 “Add at least one line item” (good) |
| API smoke | `POST /payments/collect` $1 on $0 checkout | 400 “Tender total exceeds amount due” (good) |
| Not run | Live Stripe Connect charge + webhook (no Connect keys / card in this env) | J2-06 / PAY-03 not exercised end-to-end |
| Not run | `sales-checkout.spec.ts` | **File does not exist** (docs still cite it) |

Related test-pack IDs reviewed (not re-executed as E2E): **J2-05/06**, **J3-07** (void with payment), **J4-03/07/10**, **FIN-02/06/07**, **PAY-03/04/05/06**, **C-P1-06 / CAP-09**, **CAT redeem-on-sale**.

---

## 4. Findings

| ID | Sev | Layer | Area | Issue | Why it breaks in production | Evidence | Suggested fix direction | Fix needed before main? |
|---|---|---|---|---|---|---|---|---|
| SALE-AUD-01 | P0 | JOB / BE | Connect webhook settlement | (1) `POST /webhooks/stripe/connect` returns 200 then `void`s verify+persist. (2) `StripeWebhookProcessor` Redis-claims `stripe-webhook:{eventId}` **before** dispatch and **never `release()`s on failure**. Failed dispatch marks `FAILED` then throw; Bull retry hits `claim === false` and **returns success without processing**. Stripe will not resend after 2xx. | Card already captured on the connected account; sale stays `OPEN`, payment `PENDING`. Staff retry close can open a **second** PaymentIntent (SALE-AUD-04). Lost payment state. | `stripe-webhook.controller.ts` `void this.stripeWebhookService.handleConnectedAccountWebhook`; `stripe-webhook.processor.ts` `claim` then skip; `IdempotencyService.claim` TTL 86400, `release` unused here | Await persist (or return 5xx if persist fails). Claim only after PROCESSED, or `release()` in `catch`. Do not skip FAILED events on claim miss — re-dispatch. Add processor tests for fail→retry. | **Y** |
| SALE-AUD-02 | P1 | BE | Void sale | `voidCheckout` only requires `status === OPEN`. Zeros `balanceDue` / `remainingAmount`. **Does not** inspect SUCCEEDED payments, refund, or require `?confirm=true`. | Cash/gift-card already taken (e.g. via `POST /payments/collect` while still OPEN) then void = money kept, sale VOID, books lie. Accidental DELETE is one click from API. | `CheckoutsService.voidCheckout`; `DELETE checkouts/:id` with no `ConfirmDeleteQueryDto`. Smoke: DELETE without confirm → 200 VOID | Block void when SUCCEEDED tenders exist (force refund path). Add `confirm=true`. Optionally cancel leftover PENDING PaymentIntents. | **Y** |
| SALE-AUD-03 | P1 | BE | Invoices status vs checkout | `InvoicesService.updateStatus` writes **any** `InvoiceStatus` on any invoice id in the tenant, including `CHECKOUT`. No FSM. No payment check. | Staff with `invoices` can `PATCH /invoices/{saleId}/status` VOID (or PAID) a POS sale, bypassing `requireEditableCheckout`. Smoke: VOID stuck on checkout GET. Empty OPEN→PAID is later self-healed by `invoiceStatusFromPayments` only when unpaid and `closedAt` is null. | Smoke `PATCH /invoices/:id/status` `{VOID}` → checkout `VOID`. `invoices.service.ts` `updateStatus`. Invoice list still defaults to STANDARD (good). | Reject `kind=CHECKOUT` on invoices status/update, or delegate to checkout void/close rules. | **Y** |
| SALE-AUD-04 | P1 | BE | Stripe collect retry | `paymentIntents.create` has **no Stripe idempotency key**. Close/collect always inserts a new `PENDING` payment then creates a new PI. Existing PENDING Stripe rows are not reused. | Network retry / double-click close / SALE-AUD-01 poll timeout → two PIs; both can succeed (`stripePaymentIntentId` unique per row, not per sale). Over-capture. | `StripePaymentIntentService.createForPayment`; `PaymentOrchestratorService.createStripeEmbeddedPayment` always `payment.create` | Idempotency key `close:{checkoutId}:{amount}` (or reuse open PENDING PI for same payable). Reject close if PENDING Stripe already exists unless confirming that PI. | **Y** |
| SALE-AUD-05 | P1 | BE | Refunds | `markPaymentRefunded` only writes `providerMetadata.refundedAt`. Does **not** set `PaymentStatus.REFUNDED`. Does **not** `syncInvoicePaymentFields`. `charge.refunded` webhook same (metadata/audit only). Stripe refund **does** use Connect `stripeAccount`. | Dashboard / sale still looks PAID after refund. FIN-07 / PAY-06 fail in production books. | `payments.service.ts` `refund` / `markPaymentRefunded`; `handleChargeRefunded` | Set `REFUNDED`, resync invoice (`PARTIAL`/`PAID`/`OPEN`), cover gift-card/wallet reverse. Processor tests for `charge.refunded`. | **Y** if refunds ship with Sales; else waive with “no refunds in v1” |
| SALE-AUD-06 | P1 | FE | Close UX / status | `waitForCheckoutSettled` returns the sale even if still `isOpen` after 30×500ms. `$0` close swallows poll errors then toasts success. List/pill maps anything not VOID/`isOpen` to **Closed** — `PARTIAL` looks Closed and is omitted from “Closed” filter (`status=PAID`). | Staff believe the card sale closed; it is still OPEN. Retry → SALE-AUD-04. Partial/collect-from-payments sales disappear from both Open and Closed filters. | `checkouts.api.ts` `waitForCheckoutSettled`; `sale-close-panel.tsx` empty `catch`; `saleStatusLabel`; `checkout.mapper.ts` `isOpen: status === OPEN` | Fail poll if still open. Surface PARTIAL as its own filter/pill. Do not toast success until `closedAt` / `!isOpen`. | **Y** for poll; PARTIAL display can follow |
| SALE-AUD-07 | P2 | FE | Filters / membership | Options drawer amount/method/staff are not query params (`ListCheckoutsQueryDto` has no such fields). Membership redemption field exists but is **not imported** into add-service UI. | Filters lie. Membership-covered services cannot be redeemed at POS from the UI (backend finalize path exists). | `sales-workspace.tsx` `listFilters`; `CheckoutMembershipField` unused | Wire query params or remove dead fields. Mount membership field on service add. | N |
| SALE-AUD-08 | P2 | BE / FE | Tests | No `sales-checkout.spec.ts` (still referenced in `docs/production-consistency-test-cases.md`). No gift-card redemption unit spec. Dispatch platform-branch spec **fails** (7 constructor args vs 8 — `platformWebhookHandler` undefined). Orchestrator spec covers cash + embedded PI, not webhook fail/retry or void-with-pay. | Money regressions will not fail CI. Broken spec gives false confidence on Connect vs platform routing. | Jest: 1 failed / 42 passed in the sales-adjacent set. FE: token tests only | Add checkout close/void/webhook retry tests; fix dispatch spec arity; gift-card redeem spec | N (but required to lock SALE-AUD-01) |
| SALE-AUD-09 | P2 | BE | Public invoice token | Every CHECKOUT row gets `publicToken` (`randomBytes(24)`). `GET/POST public/invoices/:token` does not exclude `CHECKOUT`. Checkout DTO does not expose the token. | High-entropy, not enumerable. If a token leaks, public pay can collect on a POS sale (second charge path). | `checkout.repository.ts` create; `InvoicePaymentService.startPublicCheckout` | Skip public pay for `kind=CHECKOUT` or omit token on POS rows | N |
| SALE-AUD-10 | P2 | SEC | Settings authz | C-P1-06 **fixed**: both settings controllers use `@RequireModule('sales')` + `BusinessCapabilityGuard`. Remaining: no `@StaffPermission` (OWNER/ADMIN write, MEMBER read). | Entitled MEMBER can read fee/advanced config; cannot write. Not a money hole. CAP-09 pack text still says “likely 200”. | Controllers + `business-capability.guard.spec.ts` “wires @RequireModule(sales)” | Optional staff keys; update CAP-09 docs to pass | N |

---

## 5. ID scheme

Stable IDs: `SALE-AUD-01` … `SALE-AUD-10`. Do not renumber. Add `SALE-AUD-11+` for later findings.

---

## 6. Severity guide (applied)

- **P0:** Wrong tenant, double-charge, lost payment state, authz hole on money APIs, Connect vs platform webhook mis-route.
- **P1:** Clear bug on common staff checkout / collect / void / refund.
- **P2:** Edge polish / test gap without a demonstrated break.

---

## 7. No issue found (looked solid)

- **Tenant isolation on checkout/payment reads:** `businessId` + `deletedAt: null` on checkout, invoice, payment, custom-fee repositories. Payable resolve uses `{ id, businessId, deletedAt: null }`.
- **Connect vs platform billing boundary (code):** PI/session create passes `{ stripeAccount: chargeCtx.stripeAccountId }`. `tryDispatchPlatformBilling` returns immediately unless `source === 'platform'`. Platform checkout is ignored unless `metadata.purpose === PLATFORM_SUBSCRIPTION_PURPOSE`. Refunds to Stripe use the connected account. **PAY-05 / J9-04: no evidence Sales collect hits platform SaaS Stripe.**
- **Webhook signature secrets are split:** `STRIPE_PLATFORM_WEBHOOK_SECRET` vs `STRIPE_CONNECT_WEBHOOK_SECRET`. Persist uses unique `(provider, externalEventId)`.
- **C-P1-06 / CAP-09 module hole:** **Closed in this tree.** `@RequireModule('sales')` on custom-fees and checkout-advanced; guard spec asserts the source wiring.
- **Checkout module + staff keys:** `sales` module + `sales.checkout` on mutate/close; list uses view keys; `sales-staff-access.util` own-vs-all.
- **Close guards:** empty sale cannot close; tender must cover balance (+ tip); custom fees / advanced staff-and-method asserts run on close; over-tender rejected by orchestrator (smoke confirmed).
- **$0 unpaid OPEN stays OPEN:** `invoiceStatusFromPayments` will not auto-PAID empty POS rows; `finalizeCheckoutIfPaid` no-ops when `balanceDue > 0` or empty unpaid.
- **Finalize idempotency:** `closedAt` early return; membership usage keyed by `saleLineItemId`.
- **Gift-card tender:** `GiftCardRedemptionService` rejects VOIDED / DEPLETED / over-balance (untested by unit spec — SALE-AUD-08).
- **Invoice list vs sales list:** invoices `findMany` defaults `kind: STANDARD`; POS sales do not appear in the invoices app list.
- **Capability route:** `/business/sales` → `sales.access`.

---

## 8. Connect vs platform billing check

| Check | Result |
|---|---|
| Sale PaymentIntent / Checkout Session | Created with **connected** `stripeAccount` |
| Platform webhook `source=platform` + subscription purpose | Routed to `StripePlatformWebhookHandlerService` |
| Platform webhook `checkout.session.completed` **without** platform purpose | Not treated as SaaS billing (handler skipped) |
| Connect webhook `source=connected` | Invoice/sale settlement path (`StripeInvoicePaymentService` → orchestrator finalize) |
| Distinct webhook URLs + secrets | `webhooks/stripe/platform` vs `webhooks/stripe/connect` |
| **Mis-route found?** | **No** (PAY-05). Spec that should lock this is currently **failing** (SALE-AUD-08) — fix the test when touching webhooks |

---

## 9. Recommended fix batches (later agents)

Small, backend/money-first. Do not mix UI redesign.

### Batch A — webhook settlement (must ship or waive before main)

- **SALE-AUD-01** (and tests in SALE-AUD-08 for fail/retry)
- Await verify+persist before 200, or 5xx on persist failure
- Release Redis claim on FAILED; never skip FAILED as duplicate
- Optionally process inline if enqueue fails

### Batch B — money state machine

- **SALE-AUD-02** void + confirm
- **SALE-AUD-03** invoices API must not mutate CHECKOUT
- **SALE-AUD-05** refund status + invoice resync (or explicit “refunds out of Sales v1” waiver)
- **SALE-AUD-04** PI idempotency / reuse PENDING

### Batch C — staff close UX

- **SALE-AUD-06** poll failure + PARTIAL pill/filter
- **SALE-AUD-07** if product wants membership redeem at POS in this launch

### Batch D — polish / docs

- **SALE-AUD-08** remaining tests; fix dispatch spec
- **SALE-AUD-09** kind-gate public pay
- **SALE-AUD-10** refresh CAP-09 wording (already passing)

---

## 10. Promotion rule

Audit-only. **Do not promote Sales to `main` until P0 SALE-AUD-01 is fixed or waived** by product. P1 SALE-AUD-02/03/04 should travel with that money batch. P1 SALE-AUD-05 if refunds are in the Sales launch cut.

Cross-feature: Appointments calendar is a named dependency for J2-05 (appointment → checkout). This audit did not re-test the calendar; it only confirmed checkout create accepts `appointmentId` and finalize can mark `IN_SERVICE` → `COMPLETED`.
