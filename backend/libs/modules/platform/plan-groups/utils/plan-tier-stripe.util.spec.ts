import {
  parsePlanTierStripeMetadata,
  tierHasStripePrice,
} from './plan-tier-stripe.util';

describe('plan-tier-stripe.util', () => {
  it('parses stripe metadata from tier metadata', () => {
    expect(
      parsePlanTierStripeMetadata({
        stripe: { monthlyPriceId: 'price_m' },
      }),
    ).toEqual({ monthlyPriceId: 'price_m' });
  });

  it('detects configured stripe prices', () => {
    expect(tierHasStripePrice({ stripe: { yearlyPriceId: 'price_y' } })).toBe(
      true,
    );
    expect(tierHasStripePrice(null)).toBe(false);
  });
});
