import { HttpStatus } from '@nestjs/common';
import {
  PlanTierStatus,
  SubscriptionBillingSource,
  SubscriptionStatus,
} from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessBillingService } from './business-billing.service';

function buildService() {
  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(),
    },
    business: {
      findFirst: jest.fn(),
    },
    planTier: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const embedService = {
    buildPublicPricing: jest.fn(),
  };
  const subscriptionActionService = {
    changePackage: jest.fn(),
    cancelSubscription: jest.fn(),
  };
  const stripeSubscriptionService = {
    cancelAtPeriodEnd: jest.fn(),
    updateSubscriptionTier: jest.fn(),
    resumeSubscription: jest.fn(),
  };
  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn(),
  };
  const eventService = {
    captureState: jest.fn(),
    createEvent: jest.fn(),
  };
  const service = new BusinessBillingService(
    prisma as never,
    embedService as never,
    subscriptionActionService as never,
    stripeSubscriptionService as never,
    metadataService as never,
    eventService as never,
  );
  return {
    service,
    prisma,
    embedService,
    subscriptionActionService,
    stripeSubscriptionService,
    metadataService,
    eventService,
  };
}

describe('BusinessBillingService', () => {
  it('returns plan options for the current subscription group', async () => {
    const { service, prisma, embedService } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-2',
      planTier: { id: 'tier-2', slug: 'pro' },
    });
    prisma.business.findFirst.mockResolvedValue({ snapshotId: null });
    embedService.buildPublicPricing.mockResolvedValue({
      id: 'group-1',
      tiers: [],
    });
    prisma.planTier.findMany.mockResolvedValue([
      { id: 'tier-1', slug: 'starter', name: 'Starter', sortOrder: 0 },
      { id: 'tier-2', slug: 'pro', name: 'Pro', sortOrder: 1 },
    ]);

    const result = await service.getCurrentPlanOptions('biz-1');

    expect(result.currentPlanTierId).toBe('tier-2');
    expect(result.currentPlanTierIndex).toBe(1);
    expect(result.tiers).toHaveLength(2);
  });

  it('changes plan tier within the same group', async () => {
    const { service, prisma, subscriptionActionService } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingCycle: 'MONTHLY',
    });
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-2',
      planGroupId: 'group-1',
      status: PlanTierStatus.PUBLISHED,
    });
    subscriptionActionService.changePackage.mockResolvedValue({ ok: true });

    await service.changeCurrentPlanTier('biz-1', { planTierId: 'tier-2' }, {
      userId: 'user-1',
    } as never);

    expect(subscriptionActionService.changePackage).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({
        planGroupId: 'group-1',
        planTierId: 'tier-2',
        syncCapabilities: true,
        paymentOption: 'keep_status',
      }),
      expect.anything(),
    );
  });

  it('cancels manual subscriptions through the action service', async () => {
    const { service, prisma, subscriptionActionService, metadataService } =
      buildService();
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub-1',
        billingSource: SubscriptionBillingSource.MANUAL,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'MANUAL_INVOICE',
        paymentStatus: 'PAID',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: new Date('2026-07-01'),
        metadata: null,
      })
      .mockResolvedValueOnce({
        id: 'sub-1',
        billingSource: SubscriptionBillingSource.MANUAL,
        status: SubscriptionStatus.CANCELED,
        paymentMethod: 'MANUAL_INVOICE',
        paymentStatus: 'PAID',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: new Date('2026-07-01'),
        metadata: null,
      });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue(null);
    subscriptionActionService.cancelSubscription.mockResolvedValue({
      ok: true,
    });

    const result = await service.cancelCurrentSubscription(
      'biz-1',
      { reason: 'No longer needed' },
      { userId: 'user-1' } as never,
    );

    expect(subscriptionActionService.cancelSubscription).toHaveBeenCalledWith(
      'biz-1',
      expect.anything(),
      'No longer needed',
    );
    expect(result.status).toBe(SubscriptionStatus.CANCELED);
  });

  it('schedules Stripe cancellation at period end without local cancel', async () => {
    const {
      service,
      prisma,
      subscriptionActionService,
      stripeSubscriptionService,
      metadataService,
      eventService,
    } = buildService();
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub-1',
        billingSource: SubscriptionBillingSource.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PAID',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: new Date('2026-07-01'),
        metadata: { stripe: { subscriptionId: 'sub_stripe_1' } },
      })
      .mockResolvedValueOnce({
        id: 'sub-1',
        billingSource: SubscriptionBillingSource.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PAID',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: new Date('2026-07-01'),
        metadata: {
          stripe: {
            subscriptionId: 'sub_stripe_1',
            cancelAtPeriodEnd: true,
            cancelAt: '2026-07-01T00:00:00.000Z',
          },
        },
      });
    eventService.captureState.mockResolvedValue({});
    stripeSubscriptionService.cancelAtPeriodEnd.mockResolvedValue({
      cancelAtPeriodEnd: true,
      cancelAt: '2026-07-01T00:00:00.000Z',
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      cancelAtPeriodEnd: true,
      cancelAt: '2026-07-01T00:00:00.000Z',
    });

    const result = await service.cancelCurrentSubscription(
      'biz-1',
      { reason: 'No longer needed' },
      { userId: 'user-1' } as never,
    );

    expect(stripeSubscriptionService.cancelAtPeriodEnd).toHaveBeenCalledWith(
      'biz-1',
      'No longer needed',
    );
    expect(subscriptionActionService.cancelSubscription).not.toHaveBeenCalled();
    expect(eventService.createEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'CANCELLATION_SCHEDULED',
        actionKey: 'CANCEL_SUBSCRIPTION',
      }),
      expect.anything(),
    );
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('resumes Stripe subscription and records cancellation reversed event', async () => {
    const {
      service,
      prisma,
      stripeSubscriptionService,
      metadataService,
      eventService,
    } = buildService();
    prisma.businessSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub-1',
        billingSource: SubscriptionBillingSource.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PAID',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: new Date('2026-07-01'),
        metadata: {
          stripe: {
            subscriptionId: 'sub_stripe_1',
            cancelAtPeriodEnd: true,
          },
        },
      })
      .mockResolvedValueOnce({
        id: 'sub-1',
        billingSource: SubscriptionBillingSource.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'STRIPE',
        paymentStatus: 'PAID',
        billingCycle: 'MONTHLY',
        currentPeriodEnd: new Date('2026-07-01'),
        metadata: {
          stripe: {
            subscriptionId: 'sub_stripe_1',
            cancelAtPeriodEnd: false,
          },
        },
      });
    eventService.captureState.mockResolvedValue({});
    stripeSubscriptionService.resumeSubscription.mockResolvedValue({
      cancelAtPeriodEnd: false,
      cancelAt: null,
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      cancelAtPeriodEnd: false,
      cancelAt: null,
    });

    const result = await service.resumeCurrentSubscription('biz-1', {
      userId: 'user-1',
    } as never);

    expect(stripeSubscriptionService.resumeSubscription).toHaveBeenCalledWith(
      'biz-1',
    );
    expect(eventService.createEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'REACTIVATED',
        title: 'Cancellation reversed',
        actionKey: 'RESUME_SUBSCRIPTION',
      }),
      expect.anything(),
    );
    expect(result.cancelAtPeriodEnd).toBe(false);
    expect(result.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('rejects internal subscription cancellation', async () => {
    const { service, prisma } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      billingSource: SubscriptionBillingSource.INTERNAL,
    });

    await expect(
      service.cancelCurrentSubscription(
        'biz-1',
        { reason: 'No longer needed' },
        { userId: 'user-1' } as never,
      ),
    ).rejects.toMatchObject({
      code: ErrorCode.BAD_REQUEST,
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('rejects changing to the current tier', async () => {
    const { service, prisma } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
    });

    await expect(
      service.changeCurrentPlanTier('biz-1', { planTierId: 'tier-1' }, {
        userId: 'user-1',
      } as never),
    ).rejects.toMatchObject({
      code: ErrorCode.ALREADY_ON_TIER,
      status: HttpStatus.BAD_REQUEST,
    });
  });
});
