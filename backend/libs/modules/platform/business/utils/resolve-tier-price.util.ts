import { BusinessSubscriptionBillingCycle } from '@prisma/client';

export type TierPriceFields = {
  priceMonthly?: { toString(): string } | null;
  priceYearly?: { toString(): string } | null;
  setupFee?: { toString(): string } | null;
};

export type ResolveTierPriceResult = {
  amount: number | null;
  currency: string | null;
  missingTierPrice?: boolean;
};

export function resolveTierPrice(
  tier: TierPriceFields | null | undefined,
  billingCycle: BusinessSubscriptionBillingCycle | null | undefined,
  options?: {
    customAmount?: number | null;
    currency?: string | null;
  },
): ResolveTierPriceResult {
  const currency = options?.currency ?? null;

  if (options?.customAmount != null) {
    return { amount: options.customAmount, currency };
  }

  if (!billingCycle) {
    return { amount: null, currency };
  }

  switch (billingCycle) {
    case BusinessSubscriptionBillingCycle.MONTHLY: {
      const monthly = tier?.priceMonthly;
      if (monthly != null) {
        return { amount: Number(monthly.toString()), currency };
      }
      return { amount: null, currency, missingTierPrice: true };
    }
    case BusinessSubscriptionBillingCycle.YEARLY: {
      const yearly = tier?.priceYearly;
      if (yearly != null) {
        return { amount: Number(yearly.toString()), currency };
      }
      return { amount: null, currency, missingTierPrice: true };
    }
    case BusinessSubscriptionBillingCycle.ONE_TIME: {
      const setup = tier?.setupFee ?? tier?.priceMonthly;
      if (setup != null) {
        return { amount: Number(setup.toString()), currency };
      }
      return { amount: null, currency, missingTierPrice: true };
    }
    case BusinessSubscriptionBillingCycle.CUSTOM:
      return { amount: null, currency };
    default:
      return { amount: null, currency };
  }
}
