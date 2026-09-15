import { SubscriptionStatus } from '@prisma/client';
import {
  mapStripeSubscriptionStatus,
  hasActiveSubscriptionAccess,
  resolveSubscriptionAccessReason,
} from './subscription-status.policy';

describe('subscription-status.policy', () => {
  it('maps Stripe statuses to local enums', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe(SubscriptionStatus.ACTIVE);
    expect(mapStripeSubscriptionStatus('past_due')).toBe(
      SubscriptionStatus.PAST_DUE,
    );
    expect(mapStripeSubscriptionStatus('unpaid')).toBe(SubscriptionStatus.UNPAID);
    expect(mapStripeSubscriptionStatus('incomplete')).toBe(
      SubscriptionStatus.INCOMPLETE,
    );
    expect(mapStripeSubscriptionStatus('incomplete_expired')).toBe(
      SubscriptionStatus.INCOMPLETE,
    );
  });

  it('grants access for ACTIVE, PAST_DUE, INTERNAL', () => {
    expect(hasActiveSubscriptionAccess(SubscriptionStatus.ACTIVE)).toBe(true);
    expect(hasActiveSubscriptionAccess(SubscriptionStatus.PAST_DUE)).toBe(true);
    expect(hasActiveSubscriptionAccess(SubscriptionStatus.INTERNAL)).toBe(true);
  });

  it('cuts off UNPAID, CANCELED, INCOMPLETE', () => {
    expect(hasActiveSubscriptionAccess(SubscriptionStatus.UNPAID)).toBe(false);
    expect(hasActiveSubscriptionAccess(SubscriptionStatus.CANCELED)).toBe(false);
    expect(hasActiveSubscriptionAccess(SubscriptionStatus.INCOMPLETE)).toBe(
      false,
    );
  });

  it('TRIALING requires non-expired period when end provided', () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    expect(
      hasActiveSubscriptionAccess(SubscriptionStatus.TRIALING, {
        currentPeriodEnd: future,
      }),
    ).toBe(true);
    expect(
      hasActiveSubscriptionAccess(SubscriptionStatus.TRIALING, {
        currentPeriodEnd: past,
      }),
    ).toBe(false);
  });

  it('resolveSubscriptionAccessReason matches access matrix', () => {
    expect(
      resolveSubscriptionAccessReason(SubscriptionStatus.PAST_DUE).canAccess,
    ).toBe(true);
    expect(
      resolveSubscriptionAccessReason(SubscriptionStatus.UNPAID).reasonCode,
    ).toBe('SUBSCRIPTION_UNPAID');
  });
});
