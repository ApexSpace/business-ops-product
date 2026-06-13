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

@Injectable()
export class StripePlatformSubscriptionService {
  private readonly logger = new Logger(StripePlatformSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeApi: StripePlatformApiService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly metadataService: StripePlatformMetadataService,
  ) {}

  async updateSubscriptionTier(input: {
    businessId: string;
    planGroupId: string;
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
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

    const { priceId, productId } =
      await this.planMapping.resolvePublishedTierPrice(
        input.planGroupId,
        input.planTierId,
        input.billingCycle,
      );

    const stripe = this.stripeApi.getClient();
    await stripe.subscriptions.update(stripeMeta.subscriptionId, {
      items: [
        {
          id: stripeMeta.subscriptionItemId,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
      metadata: {
        purpose: 'platform_subscription',
        businessId: input.businessId,
        planGroupId: input.planGroupId,
        planTierId: input.planTierId,
        billingCycle: input.billingCycle,
      },
    });

    await this.prisma.businessSubscription.update({
      where: { businessId: input.businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          subscription.metadata,
          {
            priceId,
            productId: productId ?? undefined,
          },
        ),
      },
    });

    this.logger.log(
      `Updated Stripe subscription item for business ${input.businessId}`,
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
    const updated = await stripe.subscriptions.update(stripeMeta.subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        ...(reason ? { cancelReason: reason.slice(0, 500) } : {}),
      },
    });

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          subscription.metadata,
          {
            cancelAtPeriodEnd: true,
            status: updated.status,
          },
        ),
      },
    });

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
    this.logger.log(`Canceled Stripe subscription immediately for ${businessId}`);
  }
}
