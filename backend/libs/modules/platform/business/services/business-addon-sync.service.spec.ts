import { HttpStatus } from '@nestjs/common';
import {
  AddonPurchaseMode,
  AddonStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { BusinessAddonSyncService } from './business-addon-sync.service';

describe('BusinessAddonSyncService purchase gate', () => {
  function build(status: SubscriptionStatus) {
    const prisma = {
      addon: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'addon-1',
          purchaseMode: AddonPurchaseMode.INDEPENDENT,
          status: AddonStatus.PUBLISHED,
          priceMonthly: 10,
          capabilityId: 'cap-1',
        }),
      },
      businessSubscription: {
        findUnique: jest.fn().mockResolvedValue({
          status,
          planTierId: 'tier-1',
          currentPeriodEnd: new Date('2099-01-01'),
        }),
      },
      addonTierLink: { findFirst: jest.fn().mockResolvedValue(null) },
      tierIncludedAddon: { findFirst: jest.fn().mockResolvedValue(null) },
      businessAddon: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const capabilityRepo = {
      findByBusinessAndCapability: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    };
    const entitlements = { invalidate: jest.fn() };
    const addonBilling = { addPurchasedAddonItem: jest.fn() };
    const service = new BusinessAddonSyncService(
      prisma as never,
      capabilityRepo as never,
      entitlements as never,
      addonBilling as never,
    );
    return { service, prisma };
  }

  it('blocks purchase when subscription is UNPAID', async () => {
    const { service } = build(SubscriptionStatus.UNPAID);
    await expect(
      service.purchaseIndependent('biz-1', 'addon-1'),
    ).rejects.toMatchObject({
      code: ErrorCode.BAD_REQUEST,
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('blocks purchase when subscription is CANCELED', async () => {
    const { service } = build(SubscriptionStatus.CANCELED);
    await expect(
      service.purchaseIndependent('biz-1', 'addon-1'),
    ).rejects.toMatchObject({
      code: ErrorCode.BAD_REQUEST,
    });
  });

  it('blocks purchase when subscription is INCOMPLETE', async () => {
    const { service } = build(SubscriptionStatus.INCOMPLETE);
    await expect(
      service.purchaseIndependent('biz-1', 'addon-1'),
    ).rejects.toMatchObject({
      code: ErrorCode.BAD_REQUEST,
    });
  });

  it('allows purchase when subscription is PAST_DUE (grace)', async () => {
    const { service, prisma } = build(SubscriptionStatus.PAST_DUE);
    prisma.businessAddon.findUnique.mockResolvedValue(null);
    prisma.businessAddon.create.mockResolvedValue({ id: 'ba-1' });
    (prisma.businessAddon as { findUniqueOrThrow: jest.Mock }).findUniqueOrThrow =
      jest.fn().mockResolvedValue({ id: 'ba-1', addon: {} });

    await expect(
      service.purchaseIndependent('biz-1', 'addon-1'),
    ).resolves.toBeTruthy();
  });
});
