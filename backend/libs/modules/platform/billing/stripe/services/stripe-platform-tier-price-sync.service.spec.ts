import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import { StripePlatformTierPriceSyncService } from './stripe-platform-tier-price-sync.service';

describe('StripePlatformTierPriceSyncService', () => {
  const prisma = {
    planTier: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const stripeApi = {
    isConfigured: jest.fn(),
    getClient: jest.fn(),
    logStripeError: jest.fn(),
  };

  const planMapping = new StripePlatformPlanMappingService({} as never);
  let service: StripePlatformTierPriceSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StripePlatformTierPriceSyncService(
      prisma as never,
      stripeApi as never,
      planMapping,
    );
  });

  it('toCents converts decimal dollars to integer cents', () => {
    expect(service.toCents(49.99)).toBe(4999);
    expect(service.toCents('10')).toBe(1000);
    expect(service.toCents(null)).toBeNull();
  });

  it('assertCatalogMatchesStripe throws when Price unit_amount drifts', async () => {
    stripeApi.isConfigured.mockReturnValue(true);
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-1',
      priceMonthly: 50,
      priceYearly: null,
      metadata: {
        stripe: { monthlyPriceId: 'price_old' },
      },
    });
    stripeApi.getClient.mockReturnValue({
      prices: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'price_old',
          unit_amount: 4000,
        }),
      },
    });

    await expect(service.assertCatalogMatchesStripe('tier-1')).rejects.toBeInstanceOf(
      AppException,
    );
    try {
      await service.assertCatalogMatchesStripe('tier-1');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe(ErrorCode.STRIPE_PRICE_MISMATCH);
      expect((error as AppException).getStatus()).toBe(HttpStatus.CONFLICT);
    }
  });

  it('assertCatalogMatchesStripe passes when amounts match', async () => {
    stripeApi.isConfigured.mockReturnValue(true);
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-1',
      priceMonthly: 50,
      priceYearly: null,
      metadata: {
        stripe: { monthlyPriceId: 'price_ok' },
      },
    });
    stripeApi.getClient.mockReturnValue({
      prices: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'price_ok',
          unit_amount: 5000,
        }),
      },
    });

    await expect(
      service.assertCatalogMatchesStripe('tier-1'),
    ).resolves.toBeUndefined();
  });

  it('syncTierCatalogPrices creates a new Price when amount drifts', async () => {
    stripeApi.isConfigured.mockReturnValue(true);
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-1',
      name: 'Pro',
      key: 'pro',
      currency: 'USD',
      priceMonthly: 60,
      priceYearly: null,
      metadata: {
        stripe: {
          productId: 'prod_1',
          monthlyPriceId: 'price_old',
        },
      },
    });
    prisma.planTier.update.mockResolvedValue({});

    const pricesRetrieve = jest.fn().mockResolvedValue({
      id: 'price_old',
      unit_amount: 5000,
      currency: 'usd',
      active: true,
    });
    const pricesCreate = jest.fn().mockResolvedValue({
      id: 'price_new',
      unit_amount: 6000,
    });
    const pricesUpdate = jest.fn().mockResolvedValue({});
    const productsUpdate = jest.fn().mockResolvedValue({});

    stripeApi.getClient.mockReturnValue({
      products: { update: productsUpdate, create: jest.fn() },
      prices: {
        retrieve: pricesRetrieve,
        create: pricesCreate,
        update: pricesUpdate,
      },
    });

    const result = await service.syncTierCatalogPrices('tier-1');

    expect(result.synced).toBe(true);
    expect(result.createdMonthlyPrice).toBe(true);
    expect(result.monthlyPriceId).toBe('price_new');
    expect(pricesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        product: 'prod_1',
        unit_amount: 6000,
        currency: 'usd',
        recurring: { interval: 'month' },
      }),
    );
    expect(prisma.planTier.update).toHaveBeenCalled();
  });

  it('assertCatalogMatchesStripe no-ops when Stripe is not configured', async () => {
    stripeApi.isConfigured.mockReturnValue(false);
    await expect(
      service.assertCatalogMatchesStripe('tier-1'),
    ).resolves.toBeUndefined();
    expect(prisma.planTier.findFirst).not.toHaveBeenCalled();
  });

  it('sync returns not-synced status when Stripe is off', async () => {
    stripeApi.isConfigured.mockReturnValue(false);
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-1',
      priceMonthly: 10,
      priceYearly: null,
      metadata: {},
    });

    const result = await service.syncTierCatalogPrices('tier-1');
    expect(result.synced).toBe(false);
    expect(result.stripeConfigured).toBe(false);
  });

  it('throws AppException when tier missing', async () => {
    stripeApi.isConfigured.mockReturnValue(true);
    prisma.planTier.findFirst.mockResolvedValue(null);

    await expect(service.assertCatalogMatchesStripe('missing')).rejects.toBeInstanceOf(
      AppException,
    );
  });
});
