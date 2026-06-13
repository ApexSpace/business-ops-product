import { BusinessSubscriptionBillingCycle } from '@prisma/client';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';

describe('StripePlatformPlanMappingService', () => {
  const prisma = {
    planTier: { findFirst: jest.fn() },
  } as never;

  const service = new StripePlatformPlanMappingService(prisma);

  it('parses tier stripe metadata', () => {
    const meta = service.parseTierStripeMetadata({
      stripe: {
        productId: 'prod_1',
        monthlyPriceId: 'price_m',
        yearlyPriceId: 'price_y',
      },
    });

    expect(meta).toEqual({
      productId: 'prod_1',
      monthlyPriceId: 'price_m',
      yearlyPriceId: 'price_y',
    });
  });

  it('resolves monthly price id', () => {
    const priceId = service.resolvePriceId(
      { monthlyPriceId: 'price_m', yearlyPriceId: 'price_y' },
      BusinessSubscriptionBillingCycle.MONTHLY,
    );
    expect(priceId).toBe('price_m');
  });

  it('detects stripe price presence', () => {
    expect(
      service.tierHasStripePrice({ monthlyPriceId: 'price_m' }),
    ).toBe(true);
    expect(service.tierHasStripePrice({})).toBe(false);
  });
});
