import {
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  SubscriptionBillingSource,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PLATFORM_SUBSCRIPTION_PURPOSE } from '../types/stripe-platform-billing.types';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformSyncService } from './stripe-platform-sync.service';

describe('StripePlatformSyncService', () => {
  const metadataService = new StripePlatformMetadataService();

  const prisma = {
    business: {
      findFirst: jest.fn().mockResolvedValue({ status: BusinessStatus.ACTIVE }),
    },
    businessSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    businessSubscriptionPayment: {
      findFirst: jest.fn(),
    },
    planTier: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const accessService = {
    updateAccessInternal: jest.fn(),
    updateAccessFromStripeSync: jest.fn().mockResolvedValue(undefined),
  };

  const capabilitySyncService = {
    syncFromPlanTier: jest.fn(),
  };

  const eventService = {
    captureState: jest.fn().mockResolvedValue({}),
    createEvent: jest.fn().mockResolvedValue({}),
  };

  const paymentRepository = {
    create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
  };

  const planMapping = {
    parseTierStripeMetadata: jest.fn(),
  };

  const stripeApi = {
    getClient: jest.fn(),
  };

  const service = new StripePlatformSyncService(
    prisma as never,
    accessService as never,
    capabilitySyncService as never,
    eventService as never,
    paymentRepository as never,
    metadataService,
    planMapping as never,
    stripeApi as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    eventService.captureState.mockResolvedValue({});
    accessService.updateAccessFromStripeSync.mockResolvedValue(undefined);
    stripeApi.getClient.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_1',
          status: 'active',
          metadata: {
            purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
            businessId: 'biz-1',
            planGroupId: 'group-1',
            planTierId: 'tier-paid',
            billingCycle: 'MONTHLY',
          },
          items: {
            data: [
              {
                id: 'si_1',
                current_period_start: 1_700_000_000,
                current_period_end: 1_702_592_000,
                price: { id: 'price_1' },
              },
            ],
          },
        }),
      },
    });
  });

  it('applyStripeCheckoutCompleted upserts subscription and syncs capabilities', async () => {
    prisma.businessSubscription.findUnique.mockResolvedValue({
      businessId: 'biz-1',
      metadata: {
        stripe: { pendingCheckoutSessionId: 'cs_1' },
      },
    });
    prisma.businessSubscription.upsert.mockResolvedValue({});

    const result = await service.applyStripeCheckoutCompleted({
      id: 'cs_1',
      customer: 'cus_1',
      subscription: 'sub_1',
      metadata: {
        purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-paid',
        billingCycle: 'MONTHLY',
      },
    });

    expect(result).toBe(true);
    expect(accessService.updateAccessInternal).not.toHaveBeenCalled();
    expect(prisma.businessSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'biz-1' },
        update: expect.objectContaining({
          billingSource: SubscriptionBillingSource.STRIPE,
          status: SubscriptionStatus.ACTIVE,
          paymentMethod: SubscriptionPaymentMethod.STRIPE,
          paymentStatus: SubscriptionPaymentStatus.PAID,
        }),
      }),
    );
    expect(capabilitySyncService.syncFromPlanTier).toHaveBeenCalledWith(
      'biz-1',
      'tier-paid',
    );
    expect(stripeApi.getClient).toHaveBeenCalled();
    expect(accessService.updateAccessFromStripeSync).toHaveBeenCalledWith(
      prisma,
      'biz-1',
      expect.objectContaining({
        currentPeriodStart: '2023-11-14',
        currentPeriodEnd: '2023-12-14',
      }),
      expect.any(Object),
      { skipAudit: true },
    );
  });

  it('applyStripeSubscriptionCreatedOrUpdated uses stripe sync access path', async () => {
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-old',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        metadata: { stripe: { subscriptionId: 'sub_1' } },
      })
      .mockResolvedValueOnce({ id: 'local-sub-1' });
    prisma.businessSubscription.update.mockResolvedValue({});

    const result = await service.applyStripeSubscriptionCreatedOrUpdated(
      {
        id: 'sub_1',
        status: 'active',
        metadata: {
          purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
          businessId: 'biz-1',
          planTierId: 'tier-paid',
          planGroupId: 'group-1',
          billingCycle: 'MONTHLY',
        },
        items: {
          data: [
            {
              id: 'si_1',
              current_period_start: 1_700_000_000,
              current_period_end: 1_702_592_000,
              price: { id: 'price_1' },
            },
          ],
        },
      },
      {
        stripeEventId: 'evt_1',
        stripeEventType: 'customer.subscription.created',
      },
    );

    expect(result).toBe(true);
    expect(accessService.updateAccessFromStripeSync).toHaveBeenCalledWith(
      prisma,
      'biz-1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        planTierId: 'tier-paid',
        currentPeriodStart: '2023-11-14',
        currentPeriodEnd: '2023-12-14',
      }),
      expect.any(Object),
      { skipAudit: true },
    );
    expect(accessService.updateAccessInternal).not.toHaveBeenCalled();
    expect(eventService.createEvent).toHaveBeenCalled();
  });

  it('applyStripeSubscriptionCreatedOrUpdated syncs yearly billing cycle from price mapping', async () => {
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-trial',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: new Date('2026-06-01'),
        metadata: { stripe: {} },
      })
      .mockResolvedValueOnce({ id: 'local-sub-1' });
    prisma.businessSubscription.update.mockResolvedValue({});
    prisma.planTier.findMany.mockResolvedValue([
      {
        id: 'tier-paid',
        planGroupId: 'group-1',
        metadata: { stripe: { yearlyPriceId: 'price_yearly' } },
      },
    ]);
    planMapping.parseTierStripeMetadata.mockReturnValue({
      yearlyPriceId: 'price_yearly',
    });

    await service.applyStripeSubscriptionCreatedOrUpdated(
      {
        id: 'sub_1',
        status: 'active',
        metadata: {
          purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
          businessId: 'biz-1',
          planGroupId: 'group-1',
        },
        items: {
          data: [
            {
              id: 'si_1',
              current_period_start: 1_700_000_000,
              current_period_end: 1_733_145_600,
              price: { id: 'price_yearly' },
            },
          ],
        },
      },
      {
        stripeEventId: 'evt_yearly',
        stripeEventType: 'customer.subscription.updated',
      },
    );

    expect(accessService.updateAccessFromStripeSync).toHaveBeenCalledWith(
      prisma,
      'biz-1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        planTierId: 'tier-paid',
        billingCycle: BusinessSubscriptionBillingCycle.YEARLY,
        currentPeriodStart: '2023-11-14',
        currentPeriodEnd: '2024-12-02',
      }),
      expect.any(Object),
      { skipAudit: true },
    );
  });

  it('trial upgrade via checkout replaces trial period end with Stripe billing period', async () => {
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-trial',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: new Date('2026-06-01'),
        metadata: {
          stripe: { pendingCheckoutSessionId: 'cs_1' },
        },
      })
      .mockResolvedValueOnce({
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-paid',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        metadata: { stripe: { subscriptionId: 'sub_1' } },
      })
      .mockResolvedValueOnce({ id: 'local-sub-1' });
    prisma.businessSubscription.upsert.mockResolvedValue({});
    prisma.businessSubscription.update.mockResolvedValue({});

    await service.applyStripeCheckoutCompleted({
      id: 'cs_1',
      customer: 'cus_1',
      subscription: 'sub_1',
      metadata: {
        purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        businessId: 'biz-1',
        planGroupId: 'group-1',
        planTierId: 'tier-paid',
        billingCycle: 'MONTHLY',
      },
    });

    expect(accessService.updateAccessFromStripeSync).toHaveBeenCalledWith(
      prisma,
      'biz-1',
      expect.objectContaining({
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: '2023-12-14',
      }),
      expect.any(Object),
      { skipAudit: true },
    );
  });

  it('recordStripeInvoicePaid records payment via stripe sync', async () => {
    prisma.businessSubscription.findMany.mockResolvedValue([
      {
        id: 'local-sub-1',
        businessId: 'biz-1',
        billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        currency: 'USD',
        metadata: { stripe: { subscriptionId: 'sub_1' } },
      },
    ]);
    prisma.businessSubscriptionPayment.findFirst.mockResolvedValue(null);
    prisma.businessSubscription.update.mockResolvedValue({});

    const result = await service.recordStripeInvoicePaid(
      {
        id: 'in_1',
        subscription: 'sub_1',
        amount_paid: 9900,
        currency: 'usd',
        period_start: 1_700_000_000,
        period_end: 1_702_592_000,
      },
      { stripeEventId: 'evt_inv' },
    );

    expect(result).toBe(true);
    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        externalProvider: 'stripe',
        externalPaymentId: 'in_1',
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
      }),
    );
    expect(accessService.updateAccessFromStripeSync).toHaveBeenCalledWith(
      prisma,
      'biz-1',
      expect.objectContaining({
        businessStatus: BusinessStatus.ACTIVE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        amount: 99,
      }),
      expect.any(Object),
      { skipAudit: true },
    );
    expect(accessService.updateAccessInternal).not.toHaveBeenCalled();
  });

  it('applyStripeSubscriptionDeleted keeps business active and cancels subscription', async () => {
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        businessId: 'biz-1',
        metadata: { stripe: { subscriptionId: 'sub_1' } },
      })
      .mockResolvedValueOnce({ id: 'local-sub-1' });
    prisma.business.findFirst.mockResolvedValue({ status: BusinessStatus.ACTIVE });
    prisma.businessSubscription.update.mockResolvedValue({});

    const result = await service.applyStripeSubscriptionDeleted(
      {
        id: 'sub_1',
        metadata: {
          purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
          businessId: 'biz-1',
        },
      },
      { stripeEventId: 'evt_del' },
    );

    expect(result).toBe(true);
    expect(accessService.updateAccessFromStripeSync).toHaveBeenCalledWith(
      prisma,
      'biz-1',
      expect.objectContaining({
        businessStatus: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.CANCELED,
      }),
      expect.any(Object),
      { skipAudit: true },
    );
  });

  it('recordStripeInvoicePaid is idempotent for duplicate invoice', async () => {
    prisma.businessSubscription.findMany.mockResolvedValue([
      {
        id: 'local-sub-1',
        businessId: 'biz-1',
        metadata: { stripe: { subscriptionId: 'sub_1' } },
      },
    ]);
    prisma.businessSubscriptionPayment.findFirst.mockResolvedValue({
      id: 'existing-pay',
    });

    const result = await service.recordStripeInvoicePaid(
      {
        id: 'in_dup',
        subscription: 'sub_1',
        amount_paid: 9900,
      },
      { stripeEventId: 'evt_dup' },
    );

    expect(result).toBe(true);
    expect(paymentRepository.create).not.toHaveBeenCalled();
    expect(accessService.updateAccessFromStripeSync).not.toHaveBeenCalled();
  });
});

describe('StripePlatformMetadataService', () => {
  const metadataSvc = new StripePlatformMetadataService();

  it('merges subscription stripe metadata', () => {
    const merged = metadataSvc.mergeSubscriptionStripeMetadata(
      { stripe: { customerId: 'cus_1' } },
      { subscriptionId: 'sub_1', status: 'active' },
    );

    expect(merged.stripe).toMatchObject({
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      status: 'active',
      lastSyncedAt: expect.any(String),
    });
  });

  it('clears pending checkout metadata when null patch values are provided', () => {
    const merged = metadataSvc.mergeSubscriptionStripeMetadata(
      {
        stripe: {
          pendingCheckoutSessionId: 'cs_old',
          pendingPlanTierId: 'tier-1',
        },
      },
      {
        pendingCheckoutSessionId: null,
        pendingPlanGroupId: null,
        pendingPlanTierId: null,
        pendingBillingCycle: null,
        checkoutStartedAt: null,
      },
    );

    expect(merged.stripe).toMatchObject({
      pendingCheckoutSessionId: null,
      pendingPlanGroupId: null,
      pendingPlanTierId: null,
      pendingBillingCycle: null,
      checkoutStartedAt: null,
    });
  });
});
