import {
  mergePlanTierStripeIntoMetadata,
  parsePlanTierStripe,
  parsePlanTierStripeMetadata,
  resolvePlanTierMetadata,
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

  it('parses stripe mapping from metadata', () => {
    expect(
      parsePlanTierStripe({
        stripe: {
          productId: 'prod_123',
          monthlyPriceId: 'price_m',
          yearlyPriceId: 'price_y',
        },
      }),
    ).toEqual({
      productId: 'prod_123',
      monthlyPriceId: 'price_m',
      yearlyPriceId: 'price_y',
    });
  });

  it('merges stripe into metadata and clears empty stripe block', () => {
    const merged = mergePlanTierStripeIntoMetadata(
      { other: true, stripe: { productId: 'prod_old' } },
      {
        productId: 'prod_new',
        monthlyPriceId: 'price_m',
      },
    );

    expect(merged).toEqual({
      other: true,
      stripe: {
        productId: 'prod_new',
        monthlyPriceId: 'price_m',
      },
    });

    expect(
      mergePlanTierStripeIntoMetadata(merged, {
        productId: '',
        monthlyPriceId: '',
        yearlyPriceId: '',
      }),
    ).toEqual({ other: true });
  });

  it('resolvePlanTierMetadata preserves existing keys and updates stripe', () => {
    expect(
      resolvePlanTierMetadata(
        {
          stripe: { yearlyPriceId: 'price_y' },
        },
        { custom: 'value', stripe: { productId: 'prod_1' } },
      ),
    ).toEqual({
      custom: 'value',
      stripe: { yearlyPriceId: 'price_y' },
    });
  });
});
