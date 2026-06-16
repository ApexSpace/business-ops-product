import { SubscriptionBillingSource } from '@prisma/client';
import {
  getStripeControlledFieldsInUpdate,
  isActionVisibleForBillingSource,
} from './billing-source-action.util';

describe('billing-source-action.util', () => {
  it('blocks manual billing actions for Stripe subscriptions', () => {
    expect(
      isActionVisibleForBillingSource(
        'MARK_PAID',
        SubscriptionBillingSource.STRIPE,
      ),
    ).toBe(false);
    expect(
      isActionVisibleForBillingSource(
        'CHANGE_PACKAGE',
        SubscriptionBillingSource.STRIPE,
      ),
    ).toBe(true);
  });

  it('blocks Stripe-only actions for manual subscriptions', () => {
    expect(
      isActionVisibleForBillingSource(
        'OPEN_STRIPE_PORTAL',
        SubscriptionBillingSource.MANUAL,
      ),
    ).toBe(false);
    expect(
      isActionVisibleForBillingSource(
        'MARK_PAID',
        SubscriptionBillingSource.MANUAL,
      ),
    ).toBe(true);
  });

  it('hides manual payment actions for NOT_SELECTED billing source', () => {
    expect(
      isActionVisibleForBillingSource(
        'MARK_PAID',
        SubscriptionBillingSource.NOT_SELECTED,
      ),
    ).toBe(false);
    expect(
      isActionVisibleForBillingSource(
        'EXTEND_TRIAL',
        SubscriptionBillingSource.NOT_SELECTED,
      ),
    ).toBe(true);
    expect(
      isActionVisibleForBillingSource(
        'OPEN_STRIPE_PORTAL',
        SubscriptionBillingSource.NOT_SELECTED,
      ),
    ).toBe(false);
  });

  it('detects Stripe-controlled patch fields', () => {
    expect(
      getStripeControlledFieldsInUpdate({
        subscriptionStatus: 'ACTIVE',
        snapshotId: 'snap-1',
      }),
    ).toEqual(['subscriptionStatus']);
  });
});
