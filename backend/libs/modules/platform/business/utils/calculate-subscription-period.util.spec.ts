import {
  BusinessSubscriptionBillingCycle,
  SubscriptionStatus,
} from '@prisma/client';
import {
  addMonths,
  addYears,
  calculateSubscriptionPeriod,
} from './calculate-subscription-period.util';

describe('calculateSubscriptionPeriod', () => {
  it('adds one month for monthly active subscription', () => {
    const start = new Date('2026-06-10T00:00:00.000Z');
    const result = calculateSubscriptionPeriod({
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      startDate: start,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });

    expect(result.currentPeriodStart?.toISOString()).toBe(start.toISOString());
    expect(result.currentPeriodEnd?.toISOString()).toBe(
      addMonths(start, 1).toISOString(),
    );
    expect(result.nextBillingLabel).toBe('Next billing date');
  });

  it('adds one year for yearly active subscription', () => {
    const start = new Date('2026-06-10T00:00:00.000Z');
    const result = calculateSubscriptionPeriod({
      billingCycle: BusinessSubscriptionBillingCycle.YEARLY,
      startDate: start,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });

    expect(result.currentPeriodEnd?.toISOString()).toBe(
      addYears(start, 1).toISOString(),
    );
  });

  it('uses trial end for trialing subscriptions', () => {
    const trialEnd = new Date('2026-07-01T00:00:00.000Z');
    const result = calculateSubscriptionPeriod({
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      subscriptionStatus: SubscriptionStatus.TRIALING,
      currentPeriodEnd: trialEnd,
    });

    expect(result.currentPeriodEnd?.toISOString()).toBe(trialEnd.toISOString());
    expect(result.nextBillingLabel).toBe('Trial ends');
  });

  it('returns no next billing for one-time', () => {
    const start = new Date('2026-06-10T00:00:00.000Z');
    const result = calculateSubscriptionPeriod({
      billingCycle: BusinessSubscriptionBillingCycle.ONE_TIME,
      startDate: start,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    });

    expect(result.nextBillingDate).toBeNull();
  });

  it('returns no billing for internal subscriptions', () => {
    const result = calculateSubscriptionPeriod({
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      subscriptionStatus: SubscriptionStatus.INTERNAL,
    });

    expect(result.nextBillingDate).toBeNull();
    expect(result.nextBillingLabel).toBe('No billing required');
  });
});
