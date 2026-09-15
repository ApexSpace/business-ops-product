import {
  BusinessAddonSource,
  BusinessAddonStatus,
  SubscriptionBillingSource,
  SubscriptionStatus,
} from '@prisma/client';
import { StripeSubscriptionMirrorService } from './stripe-subscription-mirror.service';
import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';

describe('StripeSubscriptionMirrorService', () => {
  function build() {
    const prisma = {
      businessSubscription: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      businessAddon: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      planTier: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const accessService = {
      updateAccessInternal: jest.fn().mockResolvedValue(undefined),
    };
    const capabilitySync = {
      syncFromPlanTier: jest.fn().mockResolvedValue(undefined),
    };
    const metadataService = {
      parseSubscriptionStripeMetadata: jest.fn(),
      mergeSubscriptionStripeMetadata: jest.fn(
        (_prev: unknown, next: unknown) => ({ stripe: next }),
      ),
    };
    const planMapping = {
      parseTierStripeMetadata: jest.fn().mockReturnValue(null),
    };
    const addonSync = {
      syncIncludedFromTier: jest.fn().mockResolvedValue(undefined),
    };

    const service = new StripeSubscriptionMirrorService(
      prisma as never,
      accessService as never,
      capabilitySync as never,
      metadataService as never,
      planMapping as never,
      addonSync as never,
    );

    return { service, prisma, accessService };
  }

  it('mirrors cancelAtPeriodEnd and stripe IDs from subscription snapshot', async () => {
    const { service, prisma, accessService } = build();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      businessId: 'biz-1',
      metadata: {},
      planTierId: 'tier-1',
    });
    prisma.businessSubscription.update.mockResolvedValue({});

    const subscription = {
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: true,
      customer: 'cus_1',
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_000_000,
      metadata: { businessId: 'biz-1', purpose: 'platform_subscription' },
      items: {
        data: [
          {
            id: 'si_1',
            price: { id: 'price_1', unit_amount: 4900, product: 'prod_1' },
          },
        ],
      },
    } as unknown as StripeSubscriptionObject;

    await service.applyFromStripeSubscription(subscription);

    expect(accessService.updateAccessInternal).toHaveBeenCalled();
    expect(prisma.businessSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'biz-1' },
        data: expect.objectContaining({
          billingSource: SubscriptionBillingSource.STRIPE,
          stripeCustomerId: 'cus_1',
          stripeSubscriptionId: 'sub_1',
          stripePriceId: 'price_1',
          cancelAtPeriodEnd: true,
        }),
      }),
    );
  });

  it('clears purchased add-ons when subscription has no addon items', async () => {
    const { service, prisma } = build();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      businessId: 'biz-1',
      metadata: {},
      planTierId: 'tier-1',
    });
    prisma.businessSubscription.update.mockResolvedValue({});
    prisma.businessAddon.findMany.mockResolvedValue([
      {
        id: 'ba-1',
        addonId: 'addon-1',
        stripeSubscriptionItemId: 'si_addon',
        source: BusinessAddonSource.PURCHASED,
        status: BusinessAddonStatus.ACTIVE,
      },
    ]);

    await service.applyFromStripeSubscription({
      id: 'sub_1',
      status: 'canceled',
      cancel_at_period_end: false,
      metadata: { businessId: 'biz-1' },
      items: { data: [] },
    } as unknown as StripeSubscriptionObject);

    expect(prisma.businessAddon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ba-1' },
        data: expect.objectContaining({
          status: BusinessAddonStatus.CANCELED,
          stripeSubscriptionItemId: null,
        }),
      }),
    );
  });

  it('maps unpaid Stripe status through access update', async () => {
    const { service, prisma, accessService } = build();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      businessId: 'biz-1',
      metadata: {},
    });
    prisma.businessSubscription.update.mockResolvedValue({});

    await service.applyFromStripeSubscription({
      id: 'sub_1',
      status: 'unpaid',
      metadata: { businessId: 'biz-1' },
      items: { data: [{ id: 'si_1', price: { id: 'price_1' } }] },
    } as unknown as StripeSubscriptionObject);

    expect(accessService.updateAccessInternal).toHaveBeenCalledWith(
      expect.anything(),
      'biz-1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.UNPAID,
      }),
      expect.anything(),
      expect.anything(),
    );
  });
});
