# Platform Operations — Testing Guidelines

Use **Platform → Operations** for bulk notify / extend / migrate. Catalog editors (Tiers, Add-ons, Capabilities) open campaigns; do not manage packaging one business at a time.

## Prerequisites

1. Apply migration `20260723160000_entitlement_change_campaigns`.
2. At least one published tier with 2+ businesses subscribed.
3. Platform admin login.

## Matrix

### 1. Add-on added to tier

1. Edit an Independent add-on → include a tier used by businesses → Save.
2. Expect: businesses get `INCLUDED` add-on automatically.
3. Operations: no removal campaign.

### 2. Add-on removed from tier (grandfather)

1. Remove the tier from that add-on’s include list → Save with **Keep grandfathered**.
2. Expect: Operations → Add-ons shows a campaign grouped by tier.
3. Select a subset → **Email** → owners receive notice.
4. Select one business → **Extend** (e.g. 10 days) → that member’s due date moves.
5. **Exclude** one business → it is skipped on migrate.
6. **Migrate** remaining → included add-on revoked; grandfathered badge clears.
7. After due date with `autoForce`, remaining included members migrate without clicking.

### 3. Tier price increase

1. Raise monthly price on a published tier → Save.
2. Expect: campaign type Price; `BusinessSubscription.amount` unchanged until migrate.
3. Email + extend as needed → **Migrate** → amount / `priceAtPurchase` / latest `tierVersionId` update; Stripe remaps if billing source is Stripe (mapping required).

### 4. Tier price decrease

1. Lower price → campaign opens → Migrate → lower amount applied on next charge path.

### 5. Capability added to tier

1. Add a capability to a live tier → Save.
2. Expect: businesses on that tier get `PLAN_TIER` capability without visiting Access.
3. No removal campaign.

### 6. Capability removed from tier

1. Remove a capability from a live tier → Save.
2. Expect: businesses **keep** the capability until Operations migrate.
3. Campaign type Capabilities → Email → Migrate → capability rows align to catalog (stale `PLAN_TIER` removed).
4. Cannot convert capability to paid unless wrapped in an add-on.

### 7. Service added inside capability

1. Enable a module option / feature on a capability used by businesses.
2. Expect: feature available after entitlement cache invalidate (immediate on next resolve).

### 8. Service removed inside capability

1. Disable / unassign a feature used by businesses holding that capability.
2. Expect: `BusinessFeatureGrant` keeps access; Operations → Services campaign.
3. Email (upgrade or buy add-on) → Migrate → grants revoked → feature gone.

### 9. Bulk vs individual

1. Open a campaign with 10 businesses.
2. Select 3 → Email only those.
3. Exclude 1 → Migrate all → excluded stays grandfathered; selected migrate.

### 10. Scale sanity

1. Prefer Operations actions over N × Business → Access visits.
2. Access → Add-ons is status-only + link to Operations.

## Automated

```bash
npm test --prefix backend -- operations-campaign.service.spec
npm test --prefix backend -- capability-modules.service.spec
npm test --prefix backend -- business-addon-sync.service.spec
```
