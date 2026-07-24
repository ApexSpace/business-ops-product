import {
  EntitlementChangeCampaignMemberStatus,
  EntitlementChangeCampaignPolicy,
  EntitlementChangeCampaignStatus,
  EntitlementChangeCampaignType,
} from '@prisma/client';
import { OperationsCampaignService } from './operations-campaign.service';

describe('OperationsCampaignService', () => {
  const actor = { id: 'admin-1', email: 'admin@example.com' };

  function build() {
    const prisma = {
      entitlementChangeCampaign: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      entitlementChangeCampaignMember: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      businessMembership: { findMany: jest.fn().mockResolvedValue([]) },
      businessAddon: { updateMany: jest.fn() },
      businessSubscription: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      planTier: { findFirst: jest.fn() },
      tierVersion: { findFirst: jest.fn() },
      businessFeatureGrant: { updateMany: jest.fn() },
      addon: { findFirst: jest.fn() },
    };

    const emailNotificationService = {
      enqueueTransactionalEmail: jest.fn(),
    };
    const auditService = { log: jest.fn() };
    const entitlementService = { invalidate: jest.fn() };
    const capabilitySync = { syncFromPlanTier: jest.fn() };
    const addonSync = { syncIncludedFromTier: jest.fn() };
    const stripeSubscriptions = { updateSubscriptionTier: jest.fn() };

    const service = new OperationsCampaignService(
      prisma as never,
      emailNotificationService as never,
      auditService as never,
      entitlementService as never,
      capabilitySync as never,
      addonSync as never,
      stripeSubscriptions as never,
    );

    return {
      service,
      prisma,
      auditService,
      entitlementService,
      capabilitySync,
      addonSync,
    };
  }

  it('creates a campaign with members', async () => {
    const { service, prisma, auditService } = build();
    const created = {
      id: 'camp-1',
      type: EntitlementChangeCampaignType.TIER_PRICE,
      status: EntitlementChangeCampaignStatus.OPEN,
      policy: EntitlementChangeCampaignPolicy.APPLY_NEW_PRICE,
      summary: 'Price up',
      message: null,
      tierId: 'tier-1',
      addonId: null,
      capabilityId: null,
      featureKeys: [],
      payload: null,
      effectiveAt: null,
      autoForce: true,
      createdAt: new Date(),
      completedAt: null,
      tier: { id: 'tier-1', name: 'Starter', key: 'starter' },
      addon: null,
      capability: null,
      members: [
        {
          id: 'm1',
          businessId: 'biz-1',
          included: true,
          status: EntitlementChangeCampaignMemberStatus.PENDING,
          effectiveAt: null,
          notifiedAt: null,
          migratedAt: null,
          business: {
            id: 'biz-1',
            name: 'Acme',
            subscription: {
              planTierId: 'tier-1',
              planTier: { id: 'tier-1', name: 'Starter' },
            },
          },
        },
      ],
    };
    prisma.entitlementChangeCampaign.create.mockResolvedValue(created);

    const result = await service.createCampaign(
      {
        type: EntitlementChangeCampaignType.TIER_PRICE,
        summary: 'Price up',
        businessIds: ['biz-1'],
        tierId: 'tier-1',
        policy: EntitlementChangeCampaignPolicy.APPLY_NEW_PRICE,
      },
      actor as never,
    );

    expect(result.id).toBe('camp-1');
    expect(result.pendingCount).toBe(1);
    expect(result.groups[0]?.tierName).toBe('Starter');
    expect(auditService.log).toHaveBeenCalled();
  });

  it('extends selected members by days', async () => {
    const { service, prisma } = build();
    const campaign = {
      id: 'camp-1',
      type: EntitlementChangeCampaignType.ADDON_PACKAGING,
      status: EntitlementChangeCampaignStatus.OPEN,
      policy: EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED,
      summary: 'Addon removed',
      message: null,
      tierId: null,
      addonId: 'addon-1',
      capabilityId: null,
      featureKeys: [],
      payload: null,
      effectiveAt: new Date('2026-08-01'),
      autoForce: true,
      createdAt: new Date(),
      completedAt: null,
      tier: null,
      addon: { id: 'addon-1', name: 'SMS', key: 'sms' },
      capability: null,
      members: [],
    };
    prisma.entitlementChangeCampaign.findUnique.mockResolvedValue(campaign);
    prisma.entitlementChangeCampaignMember.findMany.mockResolvedValue([
      {
        id: 'm1',
        businessId: 'biz-1',
        included: true,
        status: EntitlementChangeCampaignMemberStatus.PENDING,
        effectiveAt: new Date('2026-08-01'),
      },
    ]);
    prisma.entitlementChangeCampaignMember.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.extend(
      'camp-1',
      { businessIds: ['biz-1'], days: 10 },
      actor as never,
    );

    expect(result.extendedCount).toBe(1);
    expect(prisma.entitlementChangeCampaignMember.updateMany).toHaveBeenCalled();
    const data =
      prisma.entitlementChangeCampaignMember.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe(EntitlementChangeCampaignMemberStatus.EXTENDED);
    expect(data.effectiveAt).toEqual(new Date('2026-08-11'));
  });

  it('migrates tier capability by syncing plan tier caps', async () => {
    const { service, prisma, capabilitySync, entitlementService } = build();
    const campaign = {
      id: 'camp-1',
      type: EntitlementChangeCampaignType.TIER_CAPABILITY,
      status: EntitlementChangeCampaignStatus.OPEN,
      policy: EntitlementChangeCampaignPolicy.FORCE_REMOVE,
      summary: 'Caps removed',
      message: null,
      tierId: 'tier-1',
      addonId: null,
      capabilityId: null,
      featureKeys: [],
      payload: { removedCapabilityIds: ['cap-1'] },
      effectiveAt: null,
      autoForce: true,
      createdAt: new Date(),
      completedAt: null,
      tier: { id: 'tier-1', name: 'Starter', key: 'starter' },
      addon: null,
      capability: null,
      members: [],
    };
    prisma.entitlementChangeCampaign.findUnique
      .mockResolvedValueOnce(campaign)
      .mockResolvedValue({ ...campaign, members: [] });
    prisma.entitlementChangeCampaignMember.findMany.mockResolvedValue([
      {
        id: 'm1',
        businessId: 'biz-1',
        included: true,
        status: EntitlementChangeCampaignMemberStatus.PENDING,
      },
    ]);
    prisma.entitlementChangeCampaignMember.update.mockResolvedValue({});
    prisma.entitlementChangeCampaignMember.count.mockResolvedValue(0);
    prisma.entitlementChangeCampaign.update.mockResolvedValue({});
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planTierId: 'tier-1',
    });

    const result = await service.migrate(
      'camp-1',
      { businessIds: ['biz-1'] },
      actor as never,
    );

    expect(result.migratedCount).toBe(1);
    expect(capabilitySync.syncFromPlanTier).toHaveBeenCalledWith(
      'biz-1',
      'tier-1',
    );
    expect(entitlementService.invalidate).toHaveBeenCalledWith('biz-1');
  });

  it('processDueCampaigns auto-migrates past-due members', async () => {
    const { service, prisma, capabilitySync } = build();
    const past = new Date(Date.now() - 60_000);
    prisma.entitlementChangeCampaign.findMany.mockResolvedValue([
      {
        id: 'camp-1',
        status: EntitlementChangeCampaignStatus.NOTIFIED,
        autoForce: true,
        effectiveAt: past,
        type: EntitlementChangeCampaignType.TIER_CAPABILITY,
        policy: EntitlementChangeCampaignPolicy.FORCE_REMOVE,
        members: [
          {
            id: 'm1',
            businessId: 'biz-1',
            included: true,
            status: EntitlementChangeCampaignMemberStatus.NOTIFIED,
            effectiveAt: past,
          },
        ],
      },
    ]);
    prisma.entitlementChangeCampaign.update.mockResolvedValue({});
    prisma.entitlementChangeCampaign.findUnique.mockResolvedValue({
      id: 'camp-1',
      type: EntitlementChangeCampaignType.TIER_CAPABILITY,
      status: EntitlementChangeCampaignStatus.DUE,
      policy: EntitlementChangeCampaignPolicy.FORCE_REMOVE,
      summary: 'x',
      message: null,
      tierId: 'tier-1',
      addonId: null,
      capabilityId: null,
      featureKeys: [],
      payload: null,
      effectiveAt: past,
      autoForce: true,
      createdAt: new Date(),
      completedAt: null,
      tier: null,
      addon: null,
      capability: null,
      members: [],
    });
    prisma.entitlementChangeCampaignMember.findMany.mockResolvedValue([
      {
        id: 'm1',
        businessId: 'biz-1',
        included: true,
        status: EntitlementChangeCampaignMemberStatus.NOTIFIED,
      },
    ]);
    prisma.entitlementChangeCampaignMember.update.mockResolvedValue({});
    prisma.entitlementChangeCampaignMember.count.mockResolvedValue(0);
    prisma.businessSubscription.findUnique.mockResolvedValue({
      planTierId: 'tier-1',
    });

    const result = await service.processDueCampaigns();
    expect(result.due).toBe(1);
    expect(result.migrated).toBe(1);
    expect(capabilitySync.syncFromPlanTier).toHaveBeenCalled();
  });
});
