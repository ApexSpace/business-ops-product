import { HttpStatus } from '@nestjs/common';
import {
  BusinessSubscriptionBillingCycle,
  SubscriptionBillingSource,
  SubscriptionStatus,
} from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripePlatformSubscriptionService } from './stripe-platform-subscription.service';

function buildService() {
  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const stripeApi = {
    getClient: jest.fn(),
  };
  const planMapping = {
    resolvePublishedTierPrice: jest.fn(),
  };
  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn(),
    mergeSubscriptionStripeMetadata: jest.fn((existing, patch) => ({
      stripe: { ...patch },
    })),
  };

  const service = new StripePlatformSubscriptionService(
    prisma as never,
    stripeApi as never,
    planMapping as never,
    metadataService as never,
  );

  return {
    service,
    prisma,
    stripeApi,
    planMapping,
    metadataService,
  };
}

describe('StripePlatformSubscriptionService', () => {
  it('resumes subscription by clearing cancel_at_period_end in Stripe', async () => {
    const { service, prisma, stripeApi, metadataService } = buildService();
    const subscriptionsUpdate = jest.fn().mockResolvedValue({ status: 'active' });
    stripeApi.getClient.mockReturnValue({
      subscriptions: { update: subscriptionsUpdate },
    });

    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      status: SubscriptionStatus.ACTIVE,
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      metadata: { stripe: { subscriptionId: 'sub_stripe_1' } },
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      subscriptionId: 'sub_stripe_1',
      cancelAtPeriodEnd: true,
    });
    prisma.businessSubscription.update.mockResolvedValue({});

    const result = await service.resumeSubscription('biz-1');

    expect(subscriptionsUpdate).toHaveBeenCalledWith('sub_stripe_1', {
      cancel_at_period_end: false,
      metadata: {
        purpose: 'platform_subscription',
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-1',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      },
    });
    expect(prisma.businessSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'biz-1' },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            stripe: expect.objectContaining({
              cancelAtPeriodEnd: false,
              cancelAt: null,
            }),
          }),
        }),
      }),
    );
    expect(result).toEqual({ cancelAtPeriodEnd: false, cancelAt: null });
  });

  it('rejects resume when subscription is already canceled', async () => {
    const { service, prisma } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      status: SubscriptionStatus.CANCELED,
      metadata: { stripe: { subscriptionId: 'sub_stripe_1' } },
    });

    await expect(service.resumeSubscription('biz-1')).rejects.toMatchObject({
      code: ErrorCode.BAD_REQUEST,
      status: HttpStatus.BAD_REQUEST,
      message: expect.stringContaining('Choose a paid plan'),
    });
  });

  it('clears scheduled cancellation when updating subscription tier', async () => {
    const { service, prisma, stripeApi, planMapping, metadataService } =
      buildService();
    const subscriptionsUpdate = jest.fn().mockResolvedValue({ status: 'active' });
    stripeApi.getClient.mockReturnValue({
      subscriptions: { update: subscriptionsUpdate },
    });
    planMapping.resolvePublishedTierPrice.mockResolvedValue({
      priceId: 'price_1',
      productId: 'prod_1',
    });
    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      metadata: {
        stripe: {
          subscriptionId: 'sub_stripe_1',
          subscriptionItemId: 'si_1',
        },
      },
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      subscriptionId: 'sub_stripe_1',
      subscriptionItemId: 'si_1',
      cancelAtPeriodEnd: true,
    });
    prisma.businessSubscription.update.mockResolvedValue({});

    await service.updateSubscriptionTier({
      businessId: 'biz-1',
      planGroupId: 'group-1',
      planTierId: 'tier-2',
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
    });

    expect(subscriptionsUpdate).toHaveBeenCalledWith(
      'sub_stripe_1',
      expect.objectContaining({
        cancel_at_period_end: false,
      }),
    );
    expect(prisma.businessSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            stripe: expect.objectContaining({
              cancelAtPeriodEnd: false,
              cancelAt: null,
            }),
          }),
        }),
      }),
    );
  });
});
