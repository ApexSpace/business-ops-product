import { BusinessSubscriptionBillingCycle } from '@prisma/client';
import { BusinessSubscriptionEventType } from '@prisma/client';

export function normalizeMonthlyPrice(
  billingCycle: BusinessSubscriptionBillingCycle | string | null | undefined,
  tier: {
    priceMonthly: { toString(): string } | null;
    priceYearly: { toString(): string } | null;
  } | null,
  fallbackAmount?: { toString(): string } | null,
): number | null {
  if (billingCycle === BusinessSubscriptionBillingCycle.MONTHLY) {
    const monthly = tier?.priceMonthly;
    if (monthly != null) return Number(monthly.toString());
  }
  if (billingCycle === BusinessSubscriptionBillingCycle.YEARLY) {
    const yearly = tier?.priceYearly;
    if (yearly != null) return Number(yearly.toString()) / 12;
  }
  if (fallbackAmount != null) return Number(fallbackAmount.toString());
  if (tier?.priceMonthly != null) return Number(tier.priceMonthly.toString());
  if (tier?.priceYearly != null) return Number(tier.priceYearly.toString()) / 12;
  return null;
}

export function resolvePlanChangeEventType(
  oldPrice: number | null,
  newPrice: number | null,
  tierChanged: boolean,
): BusinessSubscriptionEventType {
  if (!tierChanged) {
    return 'PLAN_CHANGED' as BusinessSubscriptionEventType;
  }
  if (oldPrice == null || newPrice == null) {
    return 'PLAN_CHANGED' as BusinessSubscriptionEventType;
  }
  if (newPrice > oldPrice) {
    return 'UPGRADED' as BusinessSubscriptionEventType;
  }
  if (newPrice < oldPrice) {
    return 'DOWNGRADED' as BusinessSubscriptionEventType;
  }
  return 'PLAN_CHANGED' as BusinessSubscriptionEventType;
}
