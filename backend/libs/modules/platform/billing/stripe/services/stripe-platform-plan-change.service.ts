import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessSubscriptionBillingCycle,
  SubscriptionBillingSource,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import { StripePlatformTierPriceSyncService } from './stripe-platform-tier-price-sync.service';

export type PlanChangePreview = {
  direction: 'upgrade' | 'downgrade' | 'same';
  currentTierId: string;
  targetTierId: string;
  currentTierName: string;
  targetTierName: string;
  addonsRemovedImmediately: Array<{ id: string; name: string }>;
  addonsDroppedAtPeriodEnd: Array<{ id: string; name: string }>;
  currentPeriodEnd: string | null;
};

/**
 * Business self-serve upgrade/downgrade against the same Stripe subscription.
 */
@Injectable()
export class StripePlatformPlanChangeService {
  private readonly logger = new Logger(StripePlatformPlanChangeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly tierPriceSync: StripePlatformTierPriceSyncService,
  ) {}

  async previewPlanChange(
    businessId: string,
    targetTierId: string,
  ): Promise<PlanChangePreview> {
    const { subscription, currentTier, targetTier, direction } =
      await this.resolveChangeContext(businessId, targetTierId);

    const currentIncluded = await this.includedAddonIds(currentTier.id);
    const targetIncluded = await this.includedAddonIds(targetTier.id);

    const paidAddons = await this.prisma.businessAddon.findMany({
      where: {
        businessId,
        status: BusinessAddonStatus.ACTIVE,
        source: BusinessAddonSource.PURCHASED,
      },
      include: { addon: { select: { id: true, name: true } } },
    });

    const addonsRemovedImmediately =
      direction === 'upgrade'
        ? paidAddons
            .filter((row) => targetIncluded.has(row.addonId))
            .map((row) => ({ id: row.addon.id, name: row.addon.name }))
        : [];

    const includedOnly = await this.prisma.businessAddon.findMany({
      where: {
        businessId,
        status: BusinessAddonStatus.ACTIVE,
        source: BusinessAddonSource.INCLUDED,
        addonId: { in: [...currentIncluded] },
      },
      include: { addon: { select: { id: true, name: true } } },
    });

    const addonsDroppedAtPeriodEnd =
      direction === 'downgrade'
        ? includedOnly
            .filter((row) => !targetIncluded.has(row.addonId))
            .map((row) => ({ id: row.addon.id, name: row.addon.name }))
        : [];

    return {
      direction,
      currentTierId: currentTier.id,
      targetTierId: targetTier.id,
      currentTierName: currentTier.name,
      targetTierName: targetTier.name,
      addonsRemovedImmediately,
      addonsDroppedAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    };
  }

  async changePlan(
    businessId: string,
    targetTierId: string,
  ): Promise<{ requested: true; preview: PlanChangePreview }> {
    const preview = await this.previewPlanChange(businessId, targetTierId);
    if (preview.direction === 'same') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Already on this plan',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { subscription, currentTier, targetTier, direction } =
      await this.resolveChangeContext(businessId, targetTierId);

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    const subscriptionId =
      subscription.stripeSubscriptionId ?? stripeMeta?.subscriptionId;
    const baseItemId = stripeMeta?.subscriptionItemId;
    if (!subscriptionId || !baseItemId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe subscription is not linked for this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.tierPriceSync.assertPriceIdsPresent(targetTier.id);

    const cycle =
      subscription.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY;
    const { priceId } = await this.planMapping.resolvePublishedTierPrice(
      subscription.planGroupId ?? undefined,
      targetTier.id,
      cycle,
    );

    const items: Array<{
      id?: string;
      price?: string;
      deleted?: boolean;
      clear_usage?: boolean;
    }> = [{ id: baseItemId, price: priceId }];

    if (direction === 'upgrade' && preview.addonsRemovedImmediately.length) {
      const paid = await this.prisma.businessAddon.findMany({
        where: {
          businessId,
          addonId: { in: preview.addonsRemovedImmediately.map((a) => a.id) },
          stripeSubscriptionItemId: { not: null },
        },
      });
      for (const row of paid) {
        if (row.stripeSubscriptionItemId) {
          items.push({
            id: row.stripeSubscriptionItemId,
            deleted: true,
          });
        }
      }
    }

    const stripe = this.stripeApi.getClient();

    if (direction === 'upgrade') {
      await stripe.subscriptions.update(subscriptionId, {
        items,
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: 'now',
        metadata: {
          purpose: 'platform_subscription',
          businessId,
          ...(subscription.planGroupId
            ? { planGroupId: subscription.planGroupId }
            : {}),
          planTierId: targetTier.id,
          billingCycle: cycle,
        },
      });
    } else {
      // Downgrade: price change at period end via subscription schedule when possible.
      const periodEnd = subscription.currentPeriodEnd;
      if (!periodEnd) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Subscription period end is missing; cannot schedule downgrade',
          HttpStatus.BAD_REQUEST,
        );
      }

      try {
        const schedule = await stripe.subscriptionSchedules.create({
          from_subscription: subscriptionId,
        });

        const currentPhaseItems =
          schedule.phases?.[0]?.items?.map((item) => ({
            price:
              typeof item.price === 'string' ? item.price : item.price?.id ?? '',
            quantity: item.quantity ?? 1,
          })) ?? [{ price: priceId, quantity: 1 }];

        // Replace base price in next phase; drop included add-on prices that leave the target tier.
        const dropAddonIds = new Set(
          preview.addonsDroppedAtPeriodEnd.map((a) => a.id),
        );
        const dropPriceIds = new Set<string>();
        if (dropAddonIds.size) {
          const addons = await this.prisma.addon.findMany({
            where: { id: { in: [...dropAddonIds] } },
          });
          for (const addon of addons) {
            const meta = this.planMapping.parseTierStripeMetadata(
              addon.metadata,
            );
            if (meta?.monthlyPriceId) dropPriceIds.add(meta.monthlyPriceId);
            if (meta?.yearlyPriceId) dropPriceIds.add(meta.yearlyPriceId);
          }
        }

        const nextItems = [
          { price: priceId, quantity: 1 },
          ...currentPhaseItems.filter(
            (item) =>
              item.price &&
              item.price !== stripeMeta?.priceId &&
              !dropPriceIds.has(item.price) &&
              item.price !== priceId,
          ),
        ];

        await stripe.subscriptionSchedules.update(schedule.id, {
          end_behavior: 'release',
          phases: [
            {
              start_date: schedule.phases?.[0]?.start_date,
              end_date: Math.floor(periodEnd.getTime() / 1000),
              items: currentPhaseItems.filter((i) => !!i.price),
            },
            {
              start_date: Math.floor(periodEnd.getTime() / 1000),
              items: nextItems.filter((i) => !!i.price),
              proration_behavior: 'none',
            },
          ],
          metadata: {
            purpose: 'platform_subscription',
            businessId,
            planTierId: targetTier.id,
            billingCycle: cycle,
            pendingDowngrade: 'true',
          },
        });
      } catch (error) {
        this.logger.warn(
          `Subscription schedule failed; falling back to immediate price update with proration none: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await stripe.subscriptions.update(subscriptionId, {
          items: [{ id: baseItemId, price: priceId }],
          proration_behavior: 'none',
          metadata: {
            purpose: 'platform_subscription',
            businessId,
            ...(subscription.planGroupId
              ? { planGroupId: subscription.planGroupId }
              : {}),
            planTierId: targetTier.id,
            billingCycle: cycle,
            pendingDowngrade: 'true',
          },
        });
      }
    }

    this.logger.log(
      `Requested ${direction} ${currentTier.name} → ${targetTier.name} for ${businessId}`,
    );

    return { requested: true, preview };
  }

  private async includedAddonIds(tierId: string): Promise<Set<string>> {
    const rows = await this.prisma.tierIncludedAddon.findMany({
      where: { tierId },
      select: { addonId: true },
    });
    return new Set(rows.map((r) => r.addonId));
  }

  private async resolveChangeContext(businessId: string, targetTierId: string) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: { planTier: true },
    });
    if (
      !subscription ||
      subscription.billingSource !== SubscriptionBillingSource.STRIPE ||
      !subscription.planTierId
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe subscription with a current tier is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [currentTier, targetTier] = await Promise.all([
      this.prisma.planTier.findFirst({
        where: { id: subscription.planTierId, deletedAt: null },
      }),
      this.prisma.planTier.findFirst({
        where: { id: targetTierId, deletedAt: null, status: 'PUBLISHED' },
      }),
    ]);
    if (!currentTier || !targetTier) {
      throw new AppException(
        ErrorCode.TIER_NOT_FOUND,
        'Tier not found',
        HttpStatus.NOT_FOUND,
      );
    }

    let direction: 'upgrade' | 'downgrade' | 'same' = 'same';
    if (targetTier.id === currentTier.id) {
      direction = 'same';
    } else if (targetTier.sortOrder > currentTier.sortOrder) {
      direction = 'upgrade';
    } else if (targetTier.sortOrder < currentTier.sortOrder) {
      direction = 'downgrade';
    } else {
      direction = 'upgrade';
    }

    return { subscription, currentTier, targetTier, direction };
  }
}
