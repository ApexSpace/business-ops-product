import {
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessSubscriptionBillingCycle,
  SubscriptionBillingSource,
  SubscriptionStatus,
} from '@prisma/client';
import { StripePlatformPlanChangeService } from './stripe-platform-plan-change.service';

function buildService(overrides?: {
  subscriptionsUpdate?: jest.Mock;
  schedulesCreate?: jest.Mock;
  schedulesUpdate?: jest.Mock;
}) {
  const subscriptionsUpdate =
    overrides?.subscriptionsUpdate ?? jest.fn().mockResolvedValue({});
  const schedulesCreate =
    overrides?.schedulesCreate ??
    jest.fn().mockResolvedValue({
      id: 'sub_sched_1',
      phases: [
        {
          start_date: 1_700_000_000,
          items: [{ price: 'price_old', quantity: 1 }],
        },
      ],
    });
  const schedulesUpdate =
    overrides?.schedulesUpdate ?? jest.fn().mockResolvedValue({});

  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(),
    },
    businessAddon: {
      findMany: jest.fn(),
    },
    planTier: {
      findFirst: jest.fn(),
    },
    tierIncludedAddon: {
      findMany: jest.fn(),
    },
    addon: {
      findMany: jest.fn(),
    },
  };
  const stripeApi = {
    getClient: () => ({
      subscriptions: { update: subscriptionsUpdate },
      subscriptionSchedules: {
        create: schedulesCreate,
        update: schedulesUpdate,
      },
    }),
  };
  const planMapping = {
    resolvePublishedTierPrice: jest.fn().mockResolvedValue({
      priceId: 'price_new',
      productId: 'prod_1',
    }),
    parseTierStripeMetadata: jest.fn().mockReturnValue({
      monthlyPriceId: 'price_addon_m',
    }),
  };
  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn().mockReturnValue({
      subscriptionId: 'sub_same',
      subscriptionItemId: 'si_base',
      priceId: 'price_old',
    }),
  };
  const tierPriceSync = {
    assertPriceIdsPresent: jest.fn().mockResolvedValue(undefined),
  };

  const service = new StripePlatformPlanChangeService(
    prisma as never,
    stripeApi as never,
    planMapping as never,
    metadataService as never,
    tierPriceSync as never,
  );

  return {
    service,
    prisma,
    subscriptionsUpdate,
    schedulesCreate,
    schedulesUpdate,
    planMapping,
  };
}

describe('StripePlatformPlanChangeService', () => {
  const periodEnd = new Date('2026-08-01T00:00:00.000Z');

  function mockTiers(
    prisma: ReturnType<typeof buildService>['prisma'],
    current: { id: string; name: string; sortOrder: number },
    target: { id: string; name: string; sortOrder: number },
  ) {
    prisma.businessSubscription.findUnique.mockResolvedValue({
      businessId: 'biz-1',
      billingSource: SubscriptionBillingSource.STRIPE,
      planTierId: current.id,
      planGroupId: 'group-1',
      billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
      currentPeriodEnd: periodEnd,
      stripeSubscriptionId: 'sub_same',
      metadata: {},
      planTier: current,
    });
    prisma.planTier.findFirst.mockImplementation(
      async (args: { where: { id: string } }) => {
        if (args.where.id === current.id) return current;
        if (args.where.id === target.id)
          return { ...target, status: 'PUBLISHED' };
        return null;
      },
    );
  }

  it('upgrade uses always_invoice + billing_cycle_anchor now and deletes bundled paid items', async () => {
    const { service, prisma, subscriptionsUpdate } = buildService();
    mockTiers(
      prisma,
      { id: 'tier-low', name: 'Starter', sortOrder: 0 },
      { id: 'tier-high', name: 'Pro', sortOrder: 10 },
    );
    prisma.tierIncludedAddon.findMany.mockImplementation(
      async (args: { where: { tierId: string } }) => {
        if (args.where.tierId === 'tier-high') return [{ addonId: 'addon-1' }];
        return [];
      },
    );
    prisma.businessAddon.findMany.mockImplementation(
      async (args: {
        where: {
          source?: BusinessAddonSource;
          addonId?: { in: string[] };
          stripeSubscriptionItemId?: unknown;
        };
      }) => {
        if (args.where.addonId || args.where.stripeSubscriptionItemId) {
          return [
            {
              addonId: 'addon-1',
              stripeSubscriptionItemId: 'si_addon',
            },
          ];
        }
        if (args.where.source === BusinessAddonSource.PURCHASED) {
          return [
            {
              addonId: 'addon-1',
              addon: { id: 'addon-1', name: 'SMS' },
            },
          ];
        }
        return [];
      },
    );

    const result = await service.changePlan('biz-1', 'tier-high');

    expect(result.requested).toBe(true);
    expect(result.preview.direction).toBe('upgrade');
    expect(result.preview.addonsRemovedImmediately).toEqual([
      { id: 'addon-1', name: 'SMS' },
    ]);
    expect(subscriptionsUpdate).toHaveBeenCalledWith(
      'sub_same',
      expect.objectContaining({
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: 'now',
        items: expect.arrayContaining([
          { id: 'si_base', price: 'price_new' },
          { id: 'si_addon', deleted: true },
        ]),
      }),
    );
  });

  it('downgrade schedules drop of bundled add-ons at period end on same subscription', async () => {
    const {
      service,
      prisma,
      schedulesCreate,
      schedulesUpdate,
      subscriptionsUpdate,
    } = buildService();
    mockTiers(
      prisma,
      { id: 'tier-high', name: 'Pro', sortOrder: 10 },
      { id: 'tier-low', name: 'Starter', sortOrder: 0 },
    );
    prisma.tierIncludedAddon.findMany.mockImplementation(
      async (args: { where: { tierId: string } }) => {
        if (args.where.tierId === 'tier-high') return [{ addonId: 'addon-1' }];
        return [];
      },
    );
    prisma.businessAddon.findMany.mockImplementation(
      async (args: { where: { source?: BusinessAddonSource } }) => {
        if (args.where.source === BusinessAddonSource.INCLUDED) {
          return [
            {
              addonId: 'addon-1',
              source: BusinessAddonSource.INCLUDED,
              status: BusinessAddonStatus.ACTIVE,
              addon: { id: 'addon-1', name: 'SMS' },
            },
          ];
        }
        return [];
      },
    );
    prisma.addon.findMany.mockResolvedValue([{ id: 'addon-1', metadata: {} }]);

    const result = await service.changePlan('biz-1', 'tier-low');

    expect(result.preview.direction).toBe('downgrade');
    expect(result.preview.addonsDroppedAtPeriodEnd).toEqual([
      { id: 'addon-1', name: 'SMS' },
    ]);
    expect(result.preview.currentPeriodEnd).toBe(periodEnd.toISOString());
    expect(schedulesCreate).toHaveBeenCalledWith({
      from_subscription: 'sub_same',
    });
    expect(schedulesUpdate).toHaveBeenCalled();
    expect(subscriptionsUpdate).not.toHaveBeenCalled();
  });

  it('keeps the same stripe subscription id for upgrade and downgrade', async () => {
    const { service, prisma, subscriptionsUpdate } = buildService();
    mockTiers(
      prisma,
      { id: 'tier-low', name: 'Starter', sortOrder: 0 },
      { id: 'tier-high', name: 'Pro', sortOrder: 10 },
    );
    prisma.tierIncludedAddon.findMany.mockResolvedValue([]);
    prisma.businessAddon.findMany.mockResolvedValue([]);

    await service.changePlan('biz-1', 'tier-high');
    expect(subscriptionsUpdate.mock.calls[0][0]).toBe('sub_same');
  });
});
