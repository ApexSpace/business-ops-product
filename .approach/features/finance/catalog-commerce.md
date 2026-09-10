# Feature runbook: Catalog and commerce settings

**Product:** PandaCue  
**Status:** current implementation  
**Last updated:** 2026-09-09

Covers products, packages, gift cards, memberships, offers, custom fees, checkout advanced settings.

---

## 1. Purpose / user-facing surface

Sellable catalog (products/variants/inventory), client packages, gift cards, membership plans, promotional offers, custom checkout fees, and advanced checkout toggles. Public slug/embed pages for packages, gift cards, memberships where implemented.

---

## 2. Current implementation map

| Area | Backend | Frontend | Route prefixes / notes |
|------|---------|----------|------------------------|
| Products | `finance/products` | `features/products` | `products`, nested options/variants/inventory/images/bundles; `product-categories` |
| Packages | `finance/packages` | `features/packages` | `package-settings`, `client-packages`, `public/packages` |
| Gift cards | `finance/gift-cards` | `features/gift-cards` | `gift-cards`, `public/gift-cards` |
| Memberships | `finance/memberships` | `features/memberships` | plans/settings/client-memberships; `public/memberships` |
| Offers | `finance/offers` | `features/offers` | `offers`, `public/offers` |
| Custom fees | `finance/custom-fees` | `features/custom-fees` | `custom-fees` |
| Checkout advanced | `finance/checkout-advanced-settings` | `features/checkout-advanced-settings` | `checkout-advanced-settings` |

**Prisma (representative):** `Product*`, `PackageTemplate`, `ClientPackage`, `PackageSettings`, `GiftCard*`, `MembershipPlan`, `ClientMembership`, `MembershipSettings`, `Offer*`, `CustomFee`, `BusinessCheckoutAdvancedSettings`.

**App routes:** `business/products|packages|gift-cards|memberships|offers`; settings for custom-fees / checkout-advanced; public slug pages and embeds.

---

## 3. Public vs authenticated APIs

- Authenticated catalog/admin CRUD.
- Public storefront-style endpoints for packages/gift-cards/memberships/offers by slug.

---

## 4. Permissions / capabilities

- Modules: `products`, `packages`, `gift_cards`, `memberships`, `offers`.
- Staff: matching `*.access|manage` keys.
- Settings manage for fees/checkout advanced as existing controllers define.

---

## 5. Cross-feature dependencies

- Sales/invoices/checkout consume catalog lines and fees.
- Payments for purchases.
- Contacts for client packages/memberships/gift cards.

---

## 6. Patterns to copy

- Settings screens under each feature (`*-settings-screen.tsx`).
- Mobile lists: shared `MobileEntityListScreen` where used (gift cards/offers patterns).
- Inventory quantity utils under products.

---

## 7. Do-not / pitfalls

- Do not invent parallel fee calculation outside checkout/invoice pipelines.
- Public slug resolution must be business-scoped via slug, not client businessId.
- Gift card / membership public pages are brand-sensitive — follow design-system tokens.

---

## 8. Verify locally

```bash
npm test --prefix backend -- --testPathPattern=product
npm test --prefix backend -- --testPathPattern=package
```

Manual: create product → add to sale/invoice → apply custom fee → checkout.

---

## 9. Related docs

- [invoices-estimates.md](./invoices-estimates.md)
- [payments-and-stripe.md](./payments-and-stripe.md)
- [INDEX](../../INDEX.md)
