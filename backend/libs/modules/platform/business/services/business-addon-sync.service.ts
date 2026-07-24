import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AddonPurchaseMode,
  AddonStatus,
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessCapabilityAssignmentStatus,
  BusinessCapabilitySource,
  BusinessSubscriptionBillingCycle,
  CapabilityStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformAddonBillingService } from '@app/modules/platform/billing/stripe/services/stripe-platform-addon-billing.service';
import { hasActiveSubscriptionAccess } from '@app/modules/platform/billing/stripe/policies/subscription-status.policy';
import { BusinessCapabilityRepository } from '../repositories/business-capability.repository';
import { EntitlementService } from './entitlement.service';

/**
 * Syncs INCLUDED business add-ons + ADDON-sourced capabilities from the assigned tier.
 * Preserves PURCHASED independent add-ons; converts PURCHASED→INCLUDED when tier includes them.
 */
@Injectable()
export class BusinessAddonSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilityRepo: BusinessCapabilityRepository,
    private readonly entitlements: EntitlementService,
    @Inject(forwardRef(() => StripePlatformAddonBillingService))
    private readonly addonBilling: StripePlatformAddonBillingService,
  ) {}

  async syncIncludedFromTier(businessId: string, tierId: string) {
    const [dependentLinks, includedRows] = await Promise.all([
      this.prisma.addonTierLink.findMany({
        where: {
          tierId,
          addon: {
            deletedAt: null,
            status: { in: [AddonStatus.PUBLISHED, AddonStatus.DRAFT] },
          },
        },
        include: { addon: true },
      }),
      this.prisma.tierIncludedAddon.findMany({
        where: {
          tierId,
          addon: {
            deletedAt: null,
            purchaseMode: AddonPurchaseMode.INDEPENDENT,
          },
        },
        include: { addon: true },
      }),
    ]);

    const shouldInclude = new Map(
      [...dependentLinks, ...includedRows].map((row) => [row.addonId, row.addon]),
    );

    const existing = await this.prisma.businessAddon.findMany({
      where: { businessId },
    });

    for (const [addonId, addon] of shouldInclude) {
      const row = existing.find((e) => e.addonId === addonId);
      if (!row) {
        await this.prisma.businessAddon.create({
          data: {
            businessId,
            addonId,
            status: BusinessAddonStatus.ACTIVE,
            source: BusinessAddonSource.INCLUDED,
            activatedAt: new Date(),
          },
        });
      } else if (row.source === BusinessAddonSource.PURCHASED) {
        // Convert purchased → included (tier now covers it) — drop Stripe item first
        await this.addonBilling.removePurchasedAddonItem({
          businessId,
          stripeSubscriptionItemId: row.stripeSubscriptionItemId,
        });
        await this.prisma.businessAddon.update({
          where: { id: row.id },
          data: {
            source: BusinessAddonSource.INCLUDED,
            status: BusinessAddonStatus.ACTIVE,
            priceAtPurchase: null,
            stripeSubscriptionItemId: null,
            canceledAt: null,
          },
        });
      } else if (row.status !== BusinessAddonStatus.ACTIVE) {
        await this.prisma.businessAddon.update({
          where: { id: row.id },
          data: {
            status: BusinessAddonStatus.ACTIVE,
            source: BusinessAddonSource.INCLUDED,
            canceledAt: null,
          },
        });
      }

      if (addon.capabilityId) {
        await this.upsertAddonCapability(businessId, addon.capabilityId);
      }
    }

    // Remove INCLUDED add-ons no longer on tier (keep PURCHASED)
    for (const row of existing) {
      if (
        row.source === BusinessAddonSource.INCLUDED &&
        row.status === BusinessAddonStatus.ACTIVE &&
        !shouldInclude.has(row.addonId)
      ) {
        await this.prisma.businessAddon.update({
          where: { id: row.id },
          data: {
            status: BusinessAddonStatus.CANCELED,
            canceledAt: new Date(),
          },
        });
        // Capability may still be granted by another active add-on or tier — resync below
      }
    }

    await this.resyncAddonCapabilities(businessId);
    await this.entitlements.invalidate(businessId);
  }

  /**
   * Safe grant: add/reactivate this add-on as INCLUDED for every business on the
   * given tiers. Does NOT revoke grandfathered INCLUDED add-ons that are no longer
   * in the catalog (use syncIncludedFromTier only on explicit tier change).
   */
  async grantIncludedAddonForTiers(
    addonId: string,
    tierIds: string[],
    options?: { businessIds?: string[] },
  ) {
    if (tierIds.length === 0) return { grantedBusinessIds: [] as string[] };

    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, deletedAt: null },
    });
    if (!addon) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'Add-on not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const subscriptions = await this.prisma.businessSubscription.findMany({
      where: {
        planTierId: { in: tierIds },
        ...(options?.businessIds?.length
          ? { businessId: { in: options.businessIds } }
          : {}),
      },
      select: { businessId: true },
    });

    const grantedBusinessIds: string[] = [];
    for (const { businessId } of subscriptions) {
      const existing = await this.prisma.businessAddon.findUnique({
        where: { businessId_addonId: { businessId, addonId } },
      });

      if (!existing) {
        await this.prisma.businessAddon.create({
          data: {
            businessId,
            addonId,
            status: BusinessAddonStatus.ACTIVE,
            source: BusinessAddonSource.INCLUDED,
            activatedAt: new Date(),
          },
        });
      } else if (existing.source === BusinessAddonSource.PURCHASED) {
        await this.addonBilling.removePurchasedAddonItem({
          businessId,
          stripeSubscriptionItemId: existing.stripeSubscriptionItemId,
        });
        await this.prisma.businessAddon.update({
          where: { id: existing.id },
          data: {
            source: BusinessAddonSource.INCLUDED,
            status: BusinessAddonStatus.ACTIVE,
            priceAtPurchase: null,
            stripeSubscriptionItemId: null,
            canceledAt: null,
          },
        });
      } else if (existing.status !== BusinessAddonStatus.ACTIVE) {
        await this.prisma.businessAddon.update({
          where: { id: existing.id },
          data: {
            status: BusinessAddonStatus.ACTIVE,
            source: BusinessAddonSource.INCLUDED,
            canceledAt: null,
            activatedAt: new Date(),
          },
        });
      } else {
        // Already INCLUDED + ACTIVE — still ensure capability (idempotent goodwill).
        if (addon.capabilityId) {
          await this.upsertAddonCapability(businessId, addon.capabilityId);
          await this.entitlements.invalidate(businessId);
        }
        continue;
      }

      if (addon.capabilityId) {
        await this.upsertAddonCapability(businessId, addon.capabilityId);
      }
      await this.entitlements.invalidate(businessId);
      grantedBusinessIds.push(businessId);
    }

    return { grantedBusinessIds };
  }

  /**
   * Re-apply ADDON-sourced capabilities for every active holder of this add-on.
   * Used when the add-on's capabilityId changes after businesses already have it.
   */
  async resyncHoldersForAddon(addonId: string) {
    const holders = await this.prisma.businessAddon.findMany({
      where: {
        addonId,
        status: BusinessAddonStatus.ACTIVE,
      },
      select: { businessId: true },
    });

    for (const { businessId } of holders) {
      await this.resyncAddonCapabilities(businessId);
      await this.entitlements.invalidate(businessId);
    }

    return { businessIds: holders.map((h) => h.businessId) };
  }

  /**
   * Grant any catalog-included add-ons missing on this business.
   * Never cancels grandfathered INCLUDED rows that are no longer in catalog.
   */
  async grantMissingIncludedFromTier(businessId: string, tierId: string) {
    const [dependentLinks, includedRows] = await Promise.all([
      this.prisma.addonTierLink.findMany({
        where: {
          tierId,
          addon: {
            deletedAt: null,
            status: { in: [AddonStatus.PUBLISHED, AddonStatus.DRAFT] },
          },
        },
        select: { addonId: true },
      }),
      this.prisma.tierIncludedAddon.findMany({
        where: {
          tierId,
          addon: {
            deletedAt: null,
            purchaseMode: AddonPurchaseMode.INDEPENDENT,
          },
        },
        select: { addonId: true },
      }),
    ]);

    const addonIds = [
      ...new Set([
        ...dependentLinks.map((r) => r.addonId),
        ...includedRows.map((r) => r.addonId),
      ]),
    ];

    const granted: string[] = [];
    for (const addonId of addonIds) {
      const result = await this.grantIncludedAddonForTiers(addonId, [tierId], {
        businessIds: [businessId],
      });
      if (result.grantedBusinessIds.includes(businessId)) {
        granted.push(addonId);
      }
    }
    return { grantedAddonIds: granted };
  }

  async purchaseIndependent(
    businessId: string,
    addonId: string,
    billingCycle: BusinessSubscriptionBillingCycle = BusinessSubscriptionBillingCycle.MONTHLY,
  ) {
    const addon = await this.prisma.addon.findFirst({
      where: { id: addonId, deletedAt: null },
    });
    if (!addon) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'Add-on not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (addon.purchaseMode !== AddonPurchaseMode.INDEPENDENT) {
      throw new AppException(
        ErrorCode.ADDON_NOT_PURCHASABLE,
        'This add-on cannot be purchased independently — upgrade your tier instead',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (addon.status !== AddonStatus.PUBLISHED) {
      throw new AppException(
        ErrorCode.ADDON_NOT_PURCHASABLE,
        'Add-on is not available for purchase',
        HttpStatus.BAD_REQUEST,
      );
    }

    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });
    if (
      !subscription ||
      !hasActiveSubscriptionAccess(subscription.status, {
        currentPeriodEnd: subscription.currentPeriodEnd,
      })
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Add-ons can only be purchased with an active subscription (active, trialing, or past_due grace)',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (subscription.planTierId) {
      const included =
        (await this.prisma.addonTierLink.findFirst({
          where: { tierId: subscription.planTierId, addonId },
        })) ||
        (await this.prisma.tierIncludedAddon.findFirst({
          where: { tierId: subscription.planTierId, addonId },
        }));
      if (included) {
        throw new AppException(
          ErrorCode.ADDON_ALREADY_INCLUDED,
          'This add-on is already included in your tier',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const price =
      billingCycle === BusinessSubscriptionBillingCycle.YEARLY
        ? addon.priceYearly
        : addon.priceMonthly;

    const existing = await this.prisma.businessAddon.findUnique({
      where: { businessId_addonId: { businessId, addonId } },
    });

    if (existing?.status === BusinessAddonStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Add-on already active',
        HttpStatus.BAD_REQUEST,
      );
    }

    let businessAddonId: string;
    if (existing) {
      const updated = await this.prisma.businessAddon.update({
        where: { id: existing.id },
        data: {
          status: BusinessAddonStatus.ACTIVE,
          source: BusinessAddonSource.PURCHASED,
          priceAtPurchase: price,
          billingCycle,
          activatedAt: new Date(),
          canceledAt: null,
        },
      });
      businessAddonId = updated.id;
    } else {
      const created = await this.prisma.businessAddon.create({
        data: {
          businessId,
          addonId,
          status: BusinessAddonStatus.ACTIVE,
          source: BusinessAddonSource.PURCHASED,
          priceAtPurchase: price,
          billingCycle,
        },
      });
      businessAddonId = created.id;
    }

    await this.addonBilling.addPurchasedAddonItem({
      businessId,
      businessAddonId,
      addonId,
      billingCycle,
    });

    await this.upsertAddonCapability(businessId, addon.capabilityId);
    await this.entitlements.invalidate(businessId);

    return this.prisma.businessAddon.findUniqueOrThrow({
      where: { businessId_addonId: { businessId, addonId } },
      include: { addon: true },
    });
  }

  async cancelPurchased(businessId: string, addonId: string) {
    const row = await this.prisma.businessAddon.findUnique({
      where: { businessId_addonId: { businessId, addonId } },
      include: { addon: true },
    });
    if (!row || row.status !== BusinessAddonStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'Active add-on not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (row.source !== BusinessAddonSource.PURCHASED) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Included add-ons are managed by your tier — upgrade or downgrade to change them',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.addonBilling.removePurchasedAddonItem({
      businessId,
      stripeSubscriptionItemId: row.stripeSubscriptionItemId,
    });

    await this.prisma.businessAddon.update({
      where: { id: row.id },
      data: {
        status: BusinessAddonStatus.CANCELED,
        canceledAt: new Date(),
        stripeSubscriptionItemId: null,
      },
    });

    await this.resyncAddonCapabilities(businessId);
    await this.entitlements.invalidate(businessId);
  }

  private async upsertAddonCapability(businessId: string, capabilityId: string) {
    const existing = await this.capabilityRepo.findByBusinessAndCapability(
      businessId,
      capabilityId,
    );
    if (!existing) {
      await this.capabilityRepo.upsert({
        businessId,
        capabilityId,
        source: BusinessCapabilitySource.ADDON,
        status: BusinessCapabilityAssignmentStatus.ACTIVE,
      });
    } else if (
      existing.source === BusinessCapabilitySource.ADDON &&
      existing.status !== BusinessCapabilityAssignmentStatus.ACTIVE
    ) {
      await this.capabilityRepo.update(existing.id, {
        status: BusinessCapabilityAssignmentStatus.ACTIVE,
      });
    }
  }

  private async resyncAddonCapabilities(businessId: string) {
    const activeAddons = await this.prisma.businessAddon.findMany({
      where: { businessId, status: BusinessAddonStatus.ACTIVE },
      include: { addon: true },
    });
    const capabilityIds = [
      ...new Set(
        activeAddons
          .map((a) => a.addon.capabilityId)
          .filter(Boolean),
      ),
    ];

    const addonSourced = await this.prisma.businessCapability.findMany({
      where: {
        businessId,
        source: BusinessCapabilitySource.ADDON,
      },
    });

    for (const row of addonSourced) {
      if (!capabilityIds.includes(row.capabilityId)) {
        await this.prisma.businessCapability.delete({ where: { id: row.id } });
      }
    }

    for (const capabilityId of capabilityIds) {
      const cap = await this.prisma.capability.findFirst({
        where: {
          id: capabilityId,
          deletedAt: null,
          status: CapabilityStatus.ACTIVE,
        },
      });
      if (cap) {
        await this.upsertAddonCapability(businessId, capabilityId);
      }
    }
  }
}
