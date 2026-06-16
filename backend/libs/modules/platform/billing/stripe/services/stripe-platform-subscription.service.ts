import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessSubscriptionBillingCycle,
  SubscriptionBillingSource,
  SubscriptionStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import type { StripeSubscriptionObject } from '../types/stripe-platform-billing.types';
import { resolveStripeSubscriptionPeriod } from '../utils/stripe-subscription-period.util';

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
      cancel_at_period_end: false,
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
            cancelAtPeriodEnd: false,
            cancelAt: null,
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
  ): Promise<{ cancelAtPeriodEnd: boolean; cancelAt: string | null }> {
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
        'This subscription is not linked to Stripe. Contact support.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (stripeMeta.cancelAtPeriodEnd === true) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cancellation is already scheduled.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripe = this.stripeApi.getClient();
    let updated: StripeSubscriptionObject;
    try {
      updated = (await stripe.subscriptions.update(
        stripeMeta.subscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            ...(reason ? { cancelReason: reason.slice(0, 500) } : {}),
          },
        },
      )) as StripeSubscriptionObject;
    } catch (error) {
      this.logger.error(
        `Stripe cancel at period end failed for business ${businessId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe could not cancel the subscription. Please try again or contact support.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    const cancelAt = updated.cancel_at
      ? new Date(updated.cancel_at * 1000).toISOString()
      : updated.cancel_at_period_end
        ? (() => {
            const { periodEnd } = resolveStripeSubscriptionPeriod(updated);
            return periodEnd ? periodEnd.toISOString() : null;
          })()
        : null;

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          subscription.metadata,
          {
            cancelAtPeriodEnd: true,
            cancelAt,
            status: updated.status,
          },
        ),
      },
    });

    return { cancelAtPeriodEnd: true, cancelAt };
  }

  async resumeSubscription(
    businessId: string,
  ): Promise<{ cancelAtPeriodEnd: false; cancelAt: null }> {
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

    if (
      subscription.status === SubscriptionStatus.CANCELED ||
      subscription.status === SubscriptionStatus.EXPIRED
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This subscription has already ended. Choose a paid plan to subscribe again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    if (!stripeMeta?.subscriptionId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This subscription is not linked to Stripe. Contact support.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (stripeMeta.cancelAtPeriodEnd !== true) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No cancellation is scheduled for this subscription.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!subscription.planGroupId || !subscription.planTierId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No plan is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripe = this.stripeApi.getClient();
    let updated: StripeSubscriptionObject;
    try {
      updated = (await stripe.subscriptions.update(stripeMeta.subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          purpose: 'platform_subscription',
          businessId,
          planGroupId: subscription.planGroupId,
          planTierId: subscription.planTierId,
          billingCycle:
            subscription.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY,
        },
      })) as StripeSubscriptionObject;
    } catch (error) {
      this.logger.error(
        `Stripe resume subscription failed for business ${businessId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe could not resume the subscription. Please try again or contact support.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          subscription.metadata,
          {
            cancelAtPeriodEnd: false,
            cancelAt: null,
            status: updated.status,
          },
        ),
      },
    });

    this.logger.log(`Resumed Stripe subscription for business ${businessId}`);

    return { cancelAtPeriodEnd: false, cancelAt: null };
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
