import { HttpStatus } from '@nestjs/common';
import { PlanTierStatus, SubscriptionBillingSource } from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessBillingService } from './business-billing.service';

function buildService() {
  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(),
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
    updateSubscriptionTier: jest.fn(),
    cancelAtPeriodEnd: jest.fn(),
  };
  const stripePlanChange = {
    changePlan: jest.fn(),
    previewPlanChange: jest.fn(),
  };
  const provisioning = {
    previewTierChange: jest.fn(),
    changeTier: jest.fn(),
  };
  const service = new BusinessBillingService(
    prisma as never,
    embedService as never,
    subscriptionActionService as never,
    stripeSubscriptionService as never,
    stripePlanChange as never,
    provisioning as never,
  );
  return {
    service,
    prisma,
    embedService,
    subscriptionActionService,
    stripeSubscriptionService,
    stripePlanChange,
    provisioning,
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

  it('changes plan tier via provisioning path for non-Stripe', async () => {
    const { service, prisma, provisioning } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingCycle: 'MONTHLY',
      billingSource: SubscriptionBillingSource.MANUAL,
    });
    provisioning.previewTierChange.mockResolvedValue({
      blocked: false,
      lostDependentAddons: [],
    });
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-2',
      planGroupId: 'group-1',
      status: PlanTierStatus.PUBLISHED,
    });

    await service.changeCurrentPlanTier('biz-1', { planTierId: 'tier-2' }, {
      userId: 'user-1',
    } as never);

    expect(provisioning.changeTier).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        tierId: 'tier-2',
      }),
    );
  });

  it('requests Stripe plan change without local provisioning write', async () => {
    const { service, prisma, provisioning, stripePlanChange } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planGroupId: 'group-1',
      planTierId: 'tier-1',
      billingCycle: 'MONTHLY',
      billingSource: SubscriptionBillingSource.STRIPE,
    });
    provisioning.previewTierChange.mockResolvedValue({
      blocked: false,
      lostDependentAddons: [],
    });
    prisma.planTier.findFirst.mockResolvedValue({
      id: 'tier-2',
      planGroupId: 'group-1',
      status: PlanTierStatus.PUBLISHED,
    });
    stripePlanChange.changePlan.mockResolvedValue({
      requested: true,
      preview: { direction: 'upgrade' },
    });

    const result = await service.changeCurrentPlanTier(
      'biz-1',
      { planTierId: 'tier-2' },
      { userId: 'user-1' } as never,
    );

    expect(stripePlanChange.changePlan).toHaveBeenCalledWith('biz-1', 'tier-2');
    expect(provisioning.changeTier).not.toHaveBeenCalled();
    expect(result).toMatchObject({ requested: true, planTierId: 'tier-2' });
  });

  it('cancels the current subscription', async () => {
    const { service, prisma, subscriptionActionService } = buildService();
    prisma.businessSubscription.findUnique.mockResolvedValue({ id: 'sub-1' });
    subscriptionActionService.cancelSubscription.mockResolvedValue({
      ok: true,
    });

    await service.cancelCurrentSubscription(
      'biz-1',
      { reason: 'No longer needed' },
      { userId: 'user-1' } as never,
    );

    expect(subscriptionActionService.cancelSubscription).toHaveBeenCalledWith(
      'biz-1',
      expect.anything(),
      'No longer needed',
    );
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
      code: ErrorCode.BAD_REQUEST,
      status: HttpStatus.BAD_REQUEST,
    });
  });
});
