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
import { hasActiveSubscriptionAccess } from '../policies/subscription-status.policy';

/**
 * Manages Stripe subscription items for PURCHASED independent add-ons only.
 * Dependent / INCLUDED add-ons never become Stripe line items.
 */
@Injectable()
export class StripePlatformAddonBillingService {
  private readonly logger = new Logger(StripePlatformAddonBillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly metadataService: StripePlatformMetadataService,
  ) {}

  async addPurchasedAddonItem(params: {
    businessId: string;
    businessAddonId: string;
    addonId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
  }): Promise<string | null> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId: params.businessId },
    });
    if (subscription?.billingSource !== SubscriptionBillingSource.STRIPE) {
      return null;
    }

    if (
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

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    if (!stripeMeta?.subscriptionId) {
      return null;
    }

    const addon = await this.prisma.addon.findFirst({
      where: { id: params.addonId, deletedAt: null },
    });
    if (!addon) {
      throw new AppException(
        ErrorCode.ADDON_NOT_FOUND,
        'Add-on not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const addonStripe = this.planMapping.parseTierStripeMetadata(addon.metadata);
    const priceId = this.planMapping.resolvePriceId(
      addonStripe,
      params.billingCycle,
    );
    if (!priceId) {
      this.logger.warn(
        `No Stripe price for addon ${params.addonId} (${params.billingCycle}); skipping item`,
      );
      return null;
    }

    const stripe = this.stripeApi.getClient();
    const item = await stripe.subscriptionItems.create({
      subscription: stripeMeta.subscriptionId,
      price: priceId,
      quantity: 1,
      proration_behavior: 'create_prorations',
      metadata: {
        purpose: 'platform_addon',
        businessId: params.businessId,
        addonId: params.addonId,
        businessAddonId: params.businessAddonId,
      },
    });

    await this.prisma.businessAddon.update({
      where: { id: params.businessAddonId },
      data: { stripeSubscriptionItemId: item.id },
    });

    this.logger.log(
      `Added Stripe addon item ${item.id} for business ${params.businessId}`,
    );
    return item.id;
  }

  async removePurchasedAddonItem(params: {
    businessId: string;
    stripeSubscriptionItemId: string | null | undefined;
  }): Promise<void> {
    if (!params.stripeSubscriptionItemId) return;

    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId: params.businessId },
    });
    if (subscription?.billingSource !== SubscriptionBillingSource.STRIPE) {
      return;
    }

    const stripe = this.stripeApi.getClient();
    try {
      await stripe.subscriptionItems.del(params.stripeSubscriptionItemId, {
        proration_behavior: 'create_prorations',
      });
      this.logger.log(
        `Removed Stripe addon item ${params.stripeSubscriptionItemId} for ${params.businessId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to remove Stripe addon item ${params.stripeSubscriptionItemId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /** After tier sync converts PURCHASED→INCLUDED, drop any leftover Stripe items. */
  async removeConvertedIncludedItems(businessId: string): Promise<void> {
    const rows = await this.prisma.businessAddon.findMany({
      where: {
        businessId,
        source: BusinessAddonSource.INCLUDED,
        status: BusinessAddonStatus.ACTIVE,
        stripeSubscriptionItemId: { not: null },
      },
    });

    for (const row of rows) {
      await this.removePurchasedAddonItem({
        businessId,
        stripeSubscriptionItemId: row.stripeSubscriptionItemId,
      });
      await this.prisma.businessAddon.update({
        where: { id: row.id },
        data: { stripeSubscriptionItemId: null, priceAtPurchase: null },
      });
    }
  }
}
