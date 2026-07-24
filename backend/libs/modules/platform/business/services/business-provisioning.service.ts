import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessLocationStatus,
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  PlanTierStatus,
  SubscriptionBillingSource,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessCapabilitySyncService } from './business-capability-sync.service';
import { BusinessAddonSyncService } from './business-addon-sync.service';
import { MedSpaBootstrapService } from './medspa-bootstrap.service';
import { EntitlementService } from './entitlement.service';
import { TiersService } from '@app/modules/platform/tiers/services/tiers.service';

export type ProvisionBusinessInput = {
  name: string;
  industryId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
  phoneCountryCode?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  website?: string | null;
  timezone?: string | null;
  /** Tier to assign (required for commercial access). */
  tierId?: string | null;
  /** Independent add-on IDs to purchase at create time. */
  purchaseAddonIds?: string[];
  accessMode?: 'TRIAL' | 'ACTIVE' | 'INTERNAL' | 'PENDING_PAYMENT';
  trialDays?: number;
  billingCycle?: BusinessSubscriptionBillingCycle;
  createdById?: string | null;
};

@Injectable()
export class BusinessProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrap: MedSpaBootstrapService,
    private readonly capabilitySync: BusinessCapabilitySyncService,
    private readonly addonSync: BusinessAddonSyncService,
    private readonly entitlements: EntitlementService,
    private readonly tiersService: TiersService,
  ) {}

  /**
   * Creates subscription + syncs tier capabilities + included add-ons + primary location bootstrap.
   * Call after the Business row exists.
   */
  async provisionAccess(
    businessId: string,
    input: ProvisionBusinessInput,
    _actor?: RequestUser | null,
  ) {
    const mode = input.accessMode ?? 'TRIAL';
    let tierId = input.tierId ?? null;

    if (!tierId) {
      const defaultTier = await this.prisma.planTier.findFirst({
        where: {
          deletedAt: null,
          status: PlanTierStatus.PUBLISHED,
          isPublic: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
      tierId = defaultTier?.id ?? null;
    }

    if (!tierId) {
      // No catalog yet — leave without subscription (legacy register path warning)
      await this.bootstrap.apply(businessId, input);
      return null;
    }

    const tier = await this.prisma.planTier.findFirst({
      where: { id: tierId, deletedAt: null },
    });
    if (!tier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const version = await this.tiersService.getLatestVersion(tierId);
    const publishedVersion =
      version ??
      (await this.prisma.tierVersion.create({
        data: {
          tierId,
          version: 1,
          priceMonthly: tier.priceMonthly,
          priceYearly: tier.priceYearly,
          staffLimit: tier.staffLimit,
          locationLimit: tier.locationLimit,
          capabilityIds: [],
          includedAddonIds: [],
          dependentAddonIds: [],
        },
      }));

    const trialDays = input.trialDays ?? tier.trialDays ?? 14;
    const now = new Date();
    const periodEnd = new Date(now);
    if (mode === 'TRIAL') {
      periodEnd.setDate(periodEnd.getDate() + trialDays);
    } else if (
      input.billingCycle === BusinessSubscriptionBillingCycle.YEARLY
    ) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const price =
      input.billingCycle === BusinessSubscriptionBillingCycle.YEARLY
        ? tier.priceYearly
        : tier.priceMonthly;

    let subscriptionStatus: SubscriptionStatus = SubscriptionStatus.TRIALING;
    let businessStatus: BusinessStatus = BusinessStatus.ACTIVE;
    let paymentStatus: SubscriptionPaymentStatus =
      SubscriptionPaymentStatus.NOT_REQUIRED;
    let billingSource: SubscriptionBillingSource =
      SubscriptionBillingSource.MANUAL;

    switch (mode) {
      case 'ACTIVE':
        subscriptionStatus = SubscriptionStatus.ACTIVE;
        paymentStatus = SubscriptionPaymentStatus.PAID;
        break;
      case 'INTERNAL':
        subscriptionStatus = SubscriptionStatus.INTERNAL;
        paymentStatus = SubscriptionPaymentStatus.NOT_REQUIRED;
        billingSource = SubscriptionBillingSource.INTERNAL;
        break;
      case 'PENDING_PAYMENT':
        subscriptionStatus = SubscriptionStatus.PENDING_PAYMENT;
        businessStatus = BusinessStatus.NOT_ACTIVE;
        paymentStatus = SubscriptionPaymentStatus.PENDING;
        break;
      case 'TRIAL':
      default:
        subscriptionStatus = SubscriptionStatus.TRIALING;
        break;
    }

    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: businessStatus },
    });

    const subscription = await this.prisma.businessSubscription.upsert({
      where: { businessId },
      create: {
        businessId,
        planTierId: tierId,
        tierVersionId: publishedVersion.id,
        status: subscriptionStatus,
        paymentMethod: SubscriptionPaymentMethod.NOT_SELECTED,
        paymentStatus,
        billingSource,
        billingCycle:
          input.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amount: price,
        priceAtPurchase: price,
        staffLimitAtPurchase: tier.staffLimit,
        locationLimitAtPurchase: tier.locationLimit,
        currency: tier.currency,
      },
      update: {
        planTierId: tierId,
        tierVersionId: publishedVersion.id,
        status: subscriptionStatus,
        paymentStatus,
        billingSource,
        billingCycle:
          input.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        amount: price,
        priceAtPurchase: price,
        staffLimitAtPurchase: tier.staffLimit,
        locationLimitAtPurchase: tier.locationLimit,
        currency: tier.currency,
      },
    });

    await this.capabilitySync.syncFromPlanTier(businessId, tierId);
    await this.addonSync.syncIncludedFromTier(businessId, tierId);

    for (const addonId of input.purchaseAddonIds ?? []) {
      await this.addonSync.purchaseIndependent(
        businessId,
        addonId,
        input.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY,
      );
    }

    await this.bootstrap.apply(businessId, input);
    await this.entitlements.invalidate(businessId);

    return subscription;
  }

  async changeTier(params: {
    businessId: string;
    tierId: string;
    actor?: RequestUser | null;
    billingCycle?: BusinessSubscriptionBillingCycle;
  }) {
    const current = await this.prisma.businessSubscription.findUnique({
      where: { businessId: params.businessId },
    });
    if (!current) {
      throw new AppException(
        ErrorCode.NO_SUBSCRIPTION,
        'No subscription found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newTier = await this.prisma.planTier.findFirst({
      where: { id: params.tierId, deletedAt: null },
    });
    if (!newTier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Enforce hard limits: cannot downgrade below current usage
    const [staffUsed, locationUsed] = await Promise.all([
      this.prisma.businessMembership.count({
        where: {
          businessId: params.businessId,
          status: 'ACTIVE',
          deletedAt: null,
          isServiceProvider: true,
        },
      }),
      this.prisma.businessLocation.count({
        where: {
          businessId: params.businessId,
          status: BusinessLocationStatus.ACTIVE,
        },
      }),
    ]);

    if (
      newTier.staffLimit != null &&
      staffUsed > newTier.staffLimit
    ) {
      throw new AppException(
        ErrorCode.TIER_LIMIT_EXCEEDED,
        `Cannot switch to this tier: you have ${staffUsed} staff but the tier allows ${newTier.staffLimit}. Remove staff first.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      newTier.locationLimit != null &&
      locationUsed > newTier.locationLimit
    ) {
      throw new AppException(
        ErrorCode.LOCATION_LIMIT_EXCEEDED,
        `Cannot switch to this tier: you have ${locationUsed} locations but the tier allows ${newTier.locationLimit}.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const version =
      (await this.tiersService.getLatestVersion(params.tierId)) ??
      (await this.prisma.tierVersion.create({
        data: {
          tierId: params.tierId,
          version: 1,
          priceMonthly: newTier.priceMonthly,
          priceYearly: newTier.priceYearly,
          staffLimit: newTier.staffLimit,
          locationLimit: newTier.locationLimit,
          capabilityIds: [],
          includedAddonIds: [],
          dependentAddonIds: [],
        },
      }));

    const cycle =
      params.billingCycle ??
      current.billingCycle ??
      BusinessSubscriptionBillingCycle.MONTHLY;
    const price =
      cycle === BusinessSubscriptionBillingCycle.YEARLY
        ? newTier.priceYearly
        : newTier.priceMonthly;

    await this.prisma.businessSubscription.update({
      where: { businessId: params.businessId },
      data: {
        planTierId: params.tierId,
        tierVersionId: version.id,
        amount: price,
        priceAtPurchase: price,
        staffLimitAtPurchase: newTier.staffLimit,
        locationLimitAtPurchase: newTier.locationLimit,
        currency: newTier.currency,
        billingCycle: cycle,
      },
    });

    await this.capabilitySync.syncFromPlanTier(
      params.businessId,
      params.tierId,
    );
    await this.addonSync.syncIncludedFromTier(
      params.businessId,
      params.tierId,
    );
    await this.entitlements.invalidate(params.businessId);

    return this.prisma.businessSubscription.findUniqueOrThrow({
      where: { businessId: params.businessId },
      include: { planTier: true },
    });
  }

  /**
   * Impact preview for tier changes: lost dependent add-ons, limit breaches.
   */
  async previewTierChange(businessId: string, newTierId: string) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });
    const currentTierId = subscription?.planTierId ?? null;

    const newTier = await this.prisma.planTier.findFirst({
      where: { id: newTierId, deletedAt: null },
    });
    if (!newTier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const [staffUsed, locationUsed, currentDependent, nextDependent] =
      await Promise.all([
        this.prisma.businessMembership.count({
          where: {
            businessId,
            status: 'ACTIVE',
            deletedAt: null,
            isServiceProvider: true,
          },
        }),
        this.prisma.businessLocation.count({
          where: {
            businessId,
            status: BusinessLocationStatus.ACTIVE,
          },
        }),
        currentTierId
          ? this.prisma.addonTierLink.findMany({
              where: { tierId: currentTierId },
              include: {
                addon: { select: { id: true, key: true, name: true } },
              },
            })
          : Promise.resolve(
              [] as Array<{
                addonId: string;
                addon: { id: string; key: string; name: string };
              }>,
            ),
        this.prisma.addonTierLink.findMany({
          where: { tierId: newTierId },
          include: {
            addon: { select: { id: true, key: true, name: true } },
          },
        }),
      ]);

    const nextIds = new Set(nextDependent.map((d) => d.addonId));
    const lostDependentAddons = currentDependent
      .filter((d) => !nextIds.has(d.addonId))
      .map((d) => d.addon);

    const staffLimitExceeded =
      newTier.staffLimit != null && staffUsed > newTier.staffLimit;
    const locationLimitExceeded =
      newTier.locationLimit != null && locationUsed > newTier.locationLimit;

    let blockReason: string | null = null;
    if (staffLimitExceeded) {
      blockReason = `You have ${staffUsed} staff but the target tier allows ${newTier.staffLimit}. Remove staff first.`;
    } else if (locationLimitExceeded) {
      blockReason = `You have ${locationUsed} locations but the target tier allows ${newTier.locationLimit}. Remove locations first.`;
    }

    return {
      currentTierId,
      newTierId,
      newTierName: newTier.name,
      staffUsed,
      staffLimit: newTier.staffLimit,
      locationUsed,
      locationLimit: newTier.locationLimit,
      lostDependentAddons,
      blocked: Boolean(blockReason),
      blockReason,
    };
  }
}
