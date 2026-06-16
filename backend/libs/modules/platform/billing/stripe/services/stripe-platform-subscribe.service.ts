import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessSubscriptionBillingCycle } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessSubscriptionActionService } from '@app/modules/platform/business/services/business-subscription-action.service';
import type { SubscribePlanTierResponseDto } from '../dto/stripe-platform-billing.dto';
import { StripePlatformCheckoutService } from './stripe-platform-checkout.service';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import { StripePlatformSubscriptionService } from './stripe-platform-subscription.service';

const ACTIVE_STRIPE_STATUSES = new Set<string>([
  'ACTIVE',
  'TRIALING',
  'PENDING_PAYMENT',
]);

const RECOVERY_SUBSCRIPTION_STATUSES = new Set<string>([
  'CANCELED',
  'EXPIRED',
  'PAST_DUE',
  'PENDING_PAYMENT',
]);

@Injectable()
export class StripePlatformSubscribeService {
  private readonly logger = new Logger(StripePlatformSubscribeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly checkoutService: StripePlatformCheckoutService,
    private readonly subscriptionService: StripePlatformSubscriptionService,
    private readonly subscriptionActionService: BusinessSubscriptionActionService,
  ) {}

  async subscribeToPlanTier(input: {
    businessId: string;
    planGroupId: string;
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
    customerEmail?: string | null;
    actor?: RequestUser;
  }): Promise<SubscribePlanTierResponseDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId: input.businessId },
      select: {
        planGroupId: true,
        planTierId: true,
        billingSource: true,
        status: true,
        metadata: true,
      },
    });

    this.logger.debug(
      `[plan-tier-cta] subscribeToPlanTier businessId=${input.businessId} planGroupId=${input.planGroupId} planTierId=${input.planTierId} billingCycle=${input.billingCycle} subscription=${JSON.stringify(
        {
          planGroupId: subscription?.planGroupId ?? null,
          planTierId: subscription?.planTierId ?? null,
          billingSource: subscription?.billingSource ?? null,
          status: subscription?.status ?? null,
          hasStripeSubscriptionId: Boolean(
            this.metadataService.parseSubscriptionStripeMetadata(
              subscription?.metadata,
            )?.subscriptionId,
          ),
        },
      )}`,
    );

    if (!input.businessId?.trim()) {
      throw new AppException(
        ErrorCode.NO_BUSINESS_CONTEXT,
        'Business context is required to subscribe',
        HttpStatus.BAD_REQUEST,
      );
    }

    const business = await this.prisma.business.findFirst({
      where: { id: input.businessId, deletedAt: null },
      select: { id: true },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.planMapping.resolvePublishedTierPrice(
      input.planGroupId,
      input.planTierId,
      input.billingCycle,
    );

    if (
      subscription?.planGroupId &&
      subscription.planGroupId !== input.planGroupId
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'This plan group is not assigned to your workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      subscription?.planTierId === input.planTierId &&
      !this.isRecoverySubscription(subscription)
    ) {
      throw new AppException(
        ErrorCode.ALREADY_ON_TIER,
        'Already on this plan',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (this.shouldUpdateExistingStripeSubscription(subscription)) {
      return this.updateExistingStripeSubscription(input, subscription!);
    }

    if (
      subscription &&
      (subscription.billingSource === 'MANUAL' ||
        subscription.billingSource === 'INTERNAL')
    ) {
      return this.handleManualBillingChange(input);
    }

    const customerEmail = input.actor
      ? await this.checkoutService.resolveActiveOwnerEmail(input.businessId)
      : input.customerEmail;

    const checkout = await this.checkoutService.createCheckoutSession({
      businessId: input.businessId,
      planGroupId: input.planGroupId,
      planTierId: input.planTierId,
      billingCycle: input.billingCycle,
      customerEmail,
    });

    return {
      action: 'checkout',
      sessionId: checkout.sessionId,
      url: checkout.url,
    };
  }

  private isRecoverySubscription(
    subscription: { status: string } | null,
  ): boolean {
    if (!subscription) return false;
    return RECOVERY_SUBSCRIPTION_STATUSES.has(subscription.status);
  }

  private shouldUpdateExistingStripeSubscription(
    subscription: {
      billingSource: string;
      status: string;
      metadata: unknown;
    } | null,
  ): boolean {
    if (subscription?.billingSource !== 'STRIPE') {
      return false;
    }
    if (!ACTIVE_STRIPE_STATUSES.has(subscription.status)) {
      return false;
    }
    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );
    return Boolean(stripeMeta?.subscriptionId);
  }

  private async updateExistingStripeSubscription(
    input: {
      businessId: string;
      planGroupId: string;
      planTierId: string;
      billingCycle: BusinessSubscriptionBillingCycle;
      actor?: RequestUser;
    },
    subscription: { planGroupId: string | null },
  ): Promise<SubscribePlanTierResponseDto> {
    const planGroupId = subscription.planGroupId ?? input.planGroupId;

    if (input.actor) {
      await this.subscriptionActionService.changePackage(
        input.businessId,
        {
          planGroupId,
          planTierId: input.planTierId,
          billingCycle: input.billingCycle,
          syncCapabilities: true,
          paymentOption: 'keep_status',
          reason: 'Self-service plan change via pricing',
        },
        input.actor,
      );
    } else {
      await this.subscriptionService.updateSubscriptionTier({
        businessId: input.businessId,
        planGroupId,
        planTierId: input.planTierId,
        billingCycle: input.billingCycle,
      });
    }

    this.logger.log(
      `Updated plan tier for business ${input.businessId} to ${input.planTierId}`,
    );

    return { action: 'tier_updated' };
  }

  private async handleManualBillingChange(input: {
    businessId: string;
    planGroupId: string;
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
    actor?: RequestUser;
  }): Promise<SubscribePlanTierResponseDto> {
    if (!input.actor) {
      throw new AppException(
        ErrorCode.MANUAL_BILLING_PLAN_CHANGE,
        'Your plan is managed by our team. Sign in to change plans from billing settings.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.subscriptionActionService.changePackage(
      input.businessId,
      {
        planGroupId: input.planGroupId,
        planTierId: input.planTierId,
        billingCycle: input.billingCycle,
        syncCapabilities: true,
        paymentOption: 'keep_status',
        reason: 'Self-service plan change via pricing',
      },
      input.actor,
    );

    return { action: 'tier_updated' };
  }
}
