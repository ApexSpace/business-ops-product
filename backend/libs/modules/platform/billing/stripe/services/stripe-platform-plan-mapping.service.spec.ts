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
    expect(service.tierHasStripePrice({ monthlyPriceId: 'price_m' })).toBe(
      true,
    );
    expect(service.tierHasStripePrice({})).toBe(false);
  });

  it('strips client-supplied stripe Price IDs and preserves existing', () => {
    const sanitized = service.sanitizeClientTierMetadata(
      {
        note: 'ok',
        stripe: {
          monthlyPriceId: 'price_evil',
          productId: 'prod_evil',
        },
      },
      {
        stripe: {
          productId: 'prod_real',
          monthlyPriceId: 'price_real',
        },
      },
    );

    expect(sanitized).toEqual({
      note: 'ok',
      stripe: {
        productId: 'prod_real',
        monthlyPriceId: 'price_real',
      },
    });
  });

  it('drops stripe block from client metadata when none exists yet', () => {
    const sanitized = service.sanitizeClientTierMetadata({
      note: 'ok',
      stripe: { monthlyPriceId: 'price_evil' },
    });
    expect(sanitized).toEqual({ note: 'ok' });
  });
});
