import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  Prisma,
  SubscriptionBillingSource,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessAccessService } from '@app/modules/platform/business/services/business-access.service';
import { BusinessCapabilitySyncService } from '@app/modules/platform/business/services/business-capability-sync.service';
import { BusinessAddonSyncService } from '@app/modules/platform/business/services/business-addon-sync.service';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { mapStripeSubscriptionStatus } from '../policies/subscription-status.policy';
import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';

const WEBHOOK_ACTOR: RequestUser = {
  id: SYSTEM_AUDIT_ACTOR_SENTINEL,
  email: 'stripe-webhook@system',
  context: 'platform',
};

/**
 * Sole writer of Stripe-owned BusinessSubscription mirror fields for STRIPE billing.
 * Used by webhooks and nightly reconciliation.
 */
@Injectable()
export class StripeSubscriptionMirrorService {
  private readonly logger = new Logger(StripeSubscriptionMirrorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: BusinessAccessService,
    private readonly capabilitySync: BusinessCapabilitySyncService,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly planMapping: StripePlatformPlanMappingService,
    @Inject(forwardRef(() => BusinessAddonSyncService))
    private readonly addonSync: BusinessAddonSyncService,
  ) {}

  async findByStripeSubscriptionId(stripeSubscriptionId: string) {
    const byColumn = await this.prisma.businessSubscription.findFirst({
      where: { stripeSubscriptionId },
    });
    if (byColumn) return byColumn;

    // Legacy fallback while metadata still holds IDs
    const rows = await this.prisma.businessSubscription.findMany({
      where: {
        billingSource: SubscriptionBillingSource.STRIPE,
        business: { type: 'TENANT', lifecycleStage: 'ACTIVE' },
      },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    });
    for (const row of rows) {
      const meta = this.metadataService.parseSubscriptionStripeMetadata(
        row.metadata,
      );
      if (meta?.subscriptionId === stripeSubscriptionId) {
        return row;
      }
    }
    return null;
  }

  private resolveId(
    value: string | { id?: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }

  private paymentStatusFor(
    status: SubscriptionStatus,
  ): SubscriptionPaymentStatus | undefined {
    if (
      status === SubscriptionStatus.PAST_DUE ||
      status === SubscriptionStatus.UNPAID ||
      status === SubscriptionStatus.INCOMPLETE ||
      status === SubscriptionStatus.PENDING_PAYMENT
    ) {
      return SubscriptionPaymentStatus.PENDING;
    }
    if (
      status === SubscriptionStatus.ACTIVE ||
      status === SubscriptionStatus.TRIALING
    ) {
      return SubscriptionPaymentStatus.PAID;
    }
    if (status === SubscriptionStatus.CANCELED) {
      return SubscriptionPaymentStatus.FAILED;
    }
    return undefined;
  }

  /**
   * Apply a full Stripe Subscription snapshot to the local mirror.
   */
  async applyFromStripeSubscription(
    subscription: StripeSubscriptionObject,
    opts?: { syncCapabilities?: boolean; amountCents?: number | null },
  ): Promise<{ businessId: string } | null> {
    const businessId = subscription.metadata?.businessId;
    if (!businessId) {
      const found = subscription.id
        ? await this.findByStripeSubscriptionId(subscription.id)
        : null;
      if (!found) return null;
      return this.applyForBusiness(found.businessId, subscription, opts);
    }
    return this.applyForBusiness(businessId, subscription, opts);
  }

  private async applyForBusiness(
    businessId: string,
    subscription: StripeSubscriptionObject,
    opts?: { syncCapabilities?: boolean; amountCents?: number | null },
  ): Promise<{ businessId: string }> {
    const local = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    const items = subscription.items?.data ?? [];
    const baseItem = items[0];
    const priceId = baseItem?.price?.id ?? null;
    const productId = this.resolveId(baseItem?.price?.product);
    const customerId = this.resolveId(subscription.customer);
    const status = mapStripeSubscriptionStatus(subscription.status);
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : null;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    let planTierId = subscription.metadata?.planTierId ?? local?.planTierId;
    const planGroupId =
      subscription.metadata?.planGroupId ?? local?.planGroupId ?? undefined;
    let billingCycle =
      (subscription.metadata?.billingCycle as
        | BusinessSubscriptionBillingCycle
        | undefined) ?? local?.billingCycle ?? undefined;

    if (priceId) {
      const resolved = await this.resolveTierFromPrice(priceId, planGroupId);
      if (resolved) {
        planTierId = resolved.planTierId;
        billingCycle = resolved.billingCycle;
      }
    }

    const amount =
      opts?.amountCents != null
        ? new Prisma.Decimal(opts.amountCents / 100)
        : baseItem?.price &&
            typeof (baseItem.price as { unit_amount?: number }).unit_amount ===
              'number'
          ? new Prisma.Decimal(
              ((baseItem.price as { unit_amount: number }).unit_amount) / 100,
            )
          : undefined;

    const businessStatus =
      status === SubscriptionStatus.CANCELED ||
      status === SubscriptionStatus.EXPIRED ||
      status === SubscriptionStatus.UNPAID ||
      status === SubscriptionStatus.INCOMPLETE
        ? BusinessStatus.NOT_ACTIVE
        : BusinessStatus.ACTIVE;

    await this.accessService.updateAccessInternal(
      this.prisma,
      businessId,
      {
        businessStatus,
        subscriptionStatus: status,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: this.paymentStatusFor(status),
        planGroupId: planGroupId ?? undefined,
        planTierId: planTierId ?? undefined,
        billingCycle: billingCycle ?? undefined,
        currentPeriodStart: periodStart
          ? periodStart.toISOString().slice(0, 10)
          : undefined,
        currentPeriodEnd: periodEnd
          ? periodEnd.toISOString().slice(0, 10)
          : undefined,
        syncCapabilitiesFromTier: opts?.syncCapabilities !== false,
      },
      WEBHOOK_ACTOR,
      { skipAudit: true },
    );

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        billingSource: SubscriptionBillingSource.STRIPE,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id ?? undefined,
        stripePriceId: priceId,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        ...(amount != null
          ? { amount, priceAtPurchase: amount }
          : {}),
        ...(subscription.canceled_at
          ? { canceledAt: new Date(subscription.canceled_at * 1000) }
          : {}),
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local?.metadata,
          {
            customerId: customerId ?? undefined,
            subscriptionId: subscription.id,
            subscriptionItemId: baseItem?.id,
            priceId: priceId ?? undefined,
            productId: productId ?? undefined,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            latestInvoiceId: this.resolveId(subscription.latest_invoice),
          },
        ),
      },
    });

    if (planTierId && opts?.syncCapabilities !== false) {
      await this.capabilitySync.syncFromPlanTier(businessId, planTierId);
      await this.addonSync.syncIncludedFromTier(businessId, planTierId);
    }

    await this.reconcileAddonItems(businessId, items);

    return { businessId };
  }

  /**
   * Diff Stripe subscription items against local BusinessAddon rows.
   * Items beyond the base tier price are treated as add-on line items.
   */
  private async reconcileAddonItems(
    businessId: string,
    items: NonNullable<StripeSubscriptionObject['items']>['data'],
  ): Promise<void> {
    const list = items ?? [];
    if (list.length <= 1) {
      // Only base item (or empty after cancel): clear Stripe-linked purchased add-ons.
      const purchased = await this.prisma.businessAddon.findMany({
        where: {
          businessId,
          status: BusinessAddonStatus.ACTIVE,
          source: BusinessAddonSource.PURCHASED,
        },
      });
      for (const row of purchased) {
        if (!row.stripeSubscriptionItemId && list.length === 1) {
          // Keep local-only purchased rows when base sub still has one item.
          continue;
        }
        await this.prisma.businessAddon.update({
          where: { id: row.id },
          data: {
            status: BusinessAddonStatus.CANCELED,
            canceledAt: new Date(),
            stripeSubscriptionItemId: null,
          },
        });
      }
      return;
    }

    const addonItemIds = new Set(
      list.slice(1).map((i) => i.id).filter((id): id is string => !!id),
    );
    const addonPriceIds = new Set(
      list
        .slice(1)
        .map((i) => i.price?.id)
        .filter((id): id is string => !!id),
    );

    const localAddons = await this.prisma.businessAddon.findMany({
      where: {
        businessId,
        status: BusinessAddonStatus.ACTIVE,
        OR: [
          { stripeSubscriptionItemId: { not: null } },
          { source: BusinessAddonSource.PURCHASED },
        ],
      },
      include: { addon: { select: { id: true, metadata: true } } },
    });

    for (const row of localAddons) {
      if (!row.stripeSubscriptionItemId) continue;
      if (!addonItemIds.has(row.stripeSubscriptionItemId)) {
        const stripeMeta = this.planMapping.parseTierStripeMetadata(
          row.addon.metadata,
        );
        const monthly = stripeMeta?.monthlyPriceId;
        if (monthly && addonPriceIds.has(monthly)) {
          // Still present by price; refresh item id if needed
          const match = list.find((i) => i.price?.id === monthly);
          if (match?.id && match.id !== row.stripeSubscriptionItemId) {
            await this.prisma.businessAddon.update({
              where: { id: row.id },
              data: { stripeSubscriptionItemId: match.id },
            });
          }
          continue;
        }
        await this.prisma.businessAddon.update({
          where: { id: row.id },
          data: {
            status: BusinessAddonStatus.CANCELED,
            canceledAt: new Date(),
            stripeSubscriptionItemId: null,
          },
        });
        this.logger.log(
          `Mirrored add-on removal for business ${businessId} addon ${row.addonId}`,
        );
      }
    }
  }

  private async resolveTierFromPrice(
    priceId: string,
    planGroupId?: string | null,
  ): Promise<{
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
  } | null> {
    const tiers = await this.prisma.planTier.findMany({
      where: {
        deletedAt: null,
        ...(planGroupId ? { planGroupId } : {}),
      },
    });

    for (const tier of tiers) {
      const stripeMeta = this.planMapping.parseTierStripeMetadata(
        tier.metadata,
      );
      if (stripeMeta?.monthlyPriceId === priceId) {
        return {
          planTierId: tier.id,
          billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        };
      }
      if (stripeMeta?.yearlyPriceId === priceId) {
        return {
          planTierId: tier.id,
          billingCycle: BusinessSubscriptionBillingCycle.YEARLY,
        };
      }
    }
    return null;
  }

  async applyCheckoutLink(input: {
    businessId: string;
    planGroupId?: string | null;
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
    customerId?: string | null;
    subscriptionId?: string | null;
  }): Promise<void> {
    const existing = await this.prisma.businessSubscription.findUnique({
      where: { businessId: input.businessId },
    });

    await this.prisma.businessSubscription.upsert({
      where: { businessId: input.businessId },
      create: {
        businessId: input.businessId,
        planGroupId: input.planGroupId ?? undefined,
        planTierId: input.planTierId,
        billingCycle: input.billingCycle,
        billingSource: SubscriptionBillingSource.STRIPE,
        status: SubscriptionStatus.INCOMPLETE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PENDING,
        stripeCustomerId: input.customerId ?? undefined,
        stripeSubscriptionId: input.subscriptionId ?? undefined,
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(null, {
          customerId: input.customerId ?? undefined,
          subscriptionId: input.subscriptionId ?? undefined,
          status: 'incomplete',
        }),
      },
      update: {
        ...(input.planGroupId ? { planGroupId: input.planGroupId } : {}),
        planTierId: input.planTierId,
        billingCycle: input.billingCycle,
        billingSource: SubscriptionBillingSource.STRIPE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        stripeCustomerId: input.customerId ?? undefined,
        stripeSubscriptionId: input.subscriptionId ?? undefined,
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          existing?.metadata,
          {
            customerId: input.customerId ?? undefined,
            subscriptionId: input.subscriptionId ?? undefined,
          },
        ),
      },
    });
  }
}
