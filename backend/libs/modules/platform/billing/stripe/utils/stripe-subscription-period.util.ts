import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';

export type StripeSubscriptionPeriod = {
  periodStart?: Date;
  periodEnd?: Date;
};

/**
 * Resolves billing period boundaries from a Stripe subscription payload.
 * Basil API (2025-03-31+) stores periods on subscription items; older APIs
 * expose them on the subscription root.
 */
export function resolveStripeSubscriptionPeriod(
  subscription: StripeSubscriptionObject,
): StripeSubscriptionPeriod {
  const items = subscription.items?.data ?? [];

  for (const item of items) {
    const itemStart = item.current_period_start;
    const itemEnd = item.current_period_end;
    if (itemStart || itemEnd) {
      return {
        periodStart: itemStart ? new Date(itemStart * 1000) : undefined,
        periodEnd: itemEnd ? new Date(itemEnd * 1000) : undefined,
      };
    }
  }

  const subStart = subscription.current_period_start;
  const subEnd = subscription.current_period_end;
  return {
    periodStart: subStart ? new Date(subStart * 1000) : undefined,
    periodEnd: subEnd ? new Date(subEnd * 1000) : undefined,
  };
}
