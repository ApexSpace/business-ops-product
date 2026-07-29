import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
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

@Injectable()
export class StripePlatformSubscriptionService {
  private readonly logger = new Logger(StripePlatformSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly tierPriceSync: StripePlatformTierPriceSyncService,
  ) {}

  async updateSubscriptionTier(input: {
    businessId: string;
    planGroupId?: string | null;
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
    /** Default create_prorations; use 'none' for catalog price migrations. */
    prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  }): Promise<void> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId: input.businessId },
    });

    if (subscription?.billingSource !== SubscriptionBillingSource.STRIPE) {
      return;
    }

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    if (!stripeMeta?.subscriptionId || !stripeMeta.subscriptionItemId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe subscription is not linked for this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Fail closed: Stripe Price IDs must exist and be active before remapping.
    await this.tierPriceSync.assertPriceIdsPresent(input.planTierId);

    const groupId =
      input.planGroupId ?? subscription.planGroupId ?? undefined;
    const { priceId, productId } =
      await this.planMapping.resolvePublishedTierPrice(
        groupId,
        input.planTierId,
        input.billingCycle,
      );

    const stripe = this.stripeApi.getClient();
    try {
      await stripe.subscriptions.update(stripeMeta.subscriptionId, {
        items: [
          {
            id: stripeMeta.subscriptionItemId,
            price: priceId,
          },
        ],
        proration_behavior: input.prorationBehavior ?? 'create_prorations',
        metadata: {
          purpose: 'platform_subscription',
          businessId: input.businessId,
          ...(groupId ? { planGroupId: groupId } : {}),
          planTierId: input.planTierId,
          billingCycle: input.billingCycle,
        },
      });
    } catch (error) {
      this.stripeApi.logStripeError('subscription price update', error);
      throw new AppException(
        ErrorCode.STRIPE_SUBSCRIPTION_UPDATE_FAILED,
        `Failed to update Stripe subscription price: ${
          error instanceof Error ? error.message : String(error)
        }`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    // Do not author local priceId/status — webhook mirror owns STRIPE fields.
    this.logger.log(
      `Requested Stripe subscription item update for business ${input.businessId} → ${priceId}`,
    );
  }

  async cancelAtPeriodEnd(
    businessId: string,
    reason?: string,
  ): Promise<{ cancelAtPeriodEnd: boolean }> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (subscription?.billingSource !== SubscriptionBillingSource.STRIPE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe billing is not active for this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    if (!stripeMeta?.subscriptionId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No Stripe subscription is linked',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripe = this.stripeApi.getClient();
    await stripe.subscriptions.update(stripeMeta.subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        ...(reason ? { cancelReason: reason.slice(0, 500) } : {}),
      },
    });

    // Mirror cancelAtPeriodEnd from webhook only.
    return { cancelAtPeriodEnd: true };
  }

  async cancelImmediately(businessId: string): Promise<void> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription?.metadata,
    );
    if (!stripeMeta?.subscriptionId) {
      return;
    }

    const stripe = this.stripeApi.getClient();
    await stripe.subscriptions.cancel(stripeMeta.subscriptionId);
    this.logger.log(
      `Canceled Stripe subscription immediately for ${businessId}`,
    );
  }
}
