import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';
import { resolveStripeSubscriptionPeriod } from './stripe-subscription-period.util';

describe('resolveStripeSubscriptionPeriod', () => {
  it('reads period from subscription item (Basil API)', () => {
    const subscription: StripeSubscriptionObject = {
      items: {
        data: [
          {
            id: 'si_1',
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_592_000,
          },
        ],
      },
    };

    const { periodStart, periodEnd } =
      resolveStripeSubscriptionPeriod(subscription);

    expect(periodStart?.toISOString()).toBe(
      new Date(1_700_000_000 * 1000).toISOString(),
    );
    expect(periodEnd?.toISOString()).toBe(
      new Date(1_702_592_000 * 1000).toISOString(),
    );
  });

  it('falls back to subscription-level period fields (legacy API)', () => {
    const subscription: StripeSubscriptionObject = {
      current_period_start: 1_700_000_000,
      current_period_end: 1_708_640_000,
    };

    const { periodStart, periodEnd } =
      resolveStripeSubscriptionPeriod(subscription);

    expect(periodStart?.toISOString()).toBe(
      new Date(1_700_000_000 * 1000).toISOString(),
    );
    expect(periodEnd?.toISOString()).toBe(
      new Date(1_708_640_000 * 1000).toISOString(),
    );
  });

  it('prefers subscription item periods over legacy root fields', () => {
    const subscription: StripeSubscriptionObject = {
      current_period_start: 1_600_000_000,
      current_period_end: 1_600_000_000,
      items: {
        data: [
          {
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_592_000,
          },
        ],
      },
    };

    const { periodEnd } = resolveStripeSubscriptionPeriod(subscription);

    expect(periodEnd?.toISOString()).toBe(
      new Date(1_702_592_000 * 1000).toISOString(),
    );
  });
});
