import { BusinessSubscriptionBillingCycle } from '@prisma/client';
import { resolveTierPrice } from './resolve-tier-price.util';

describe('resolveTierPrice', () => {
  const tier = {
    priceMonthly: { toString: () => '99' },
    priceYearly: { toString: () => '990' },
    setupFee: { toString: () => '50' },
  };

  it('returns monthly price', () => {
    expect(
      resolveTierPrice(tier, BusinessSubscriptionBillingCycle.MONTHLY, {
        currency: 'USD',
      }),
    ).toEqual({ amount: 99, currency: 'USD' });
  });

  it('returns yearly price', () => {
    expect(
      resolveTierPrice(tier, BusinessSubscriptionBillingCycle.YEARLY, {
        currency: 'USD',
      }),
    ).toEqual({ amount: 990, currency: 'USD' });
  });

  it('returns setup fee for one-time', () => {
    expect(
      resolveTierPrice(tier, BusinessSubscriptionBillingCycle.ONE_TIME, {
        currency: 'USD',
      }),
    ).toEqual({ amount: 50, currency: 'USD' });
  });

  it('uses custom amount when provided', () => {
    expect(
      resolveTierPrice(tier, BusinessSubscriptionBillingCycle.MONTHLY, {
        customAmount: 120,
        currency: 'USD',
      }),
    ).toEqual({ amount: 120, currency: 'USD' });
  });
});
