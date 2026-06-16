import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  PlanTierStatus,
  SubscriptionBillingSource,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PlanEmbedService } from '@app/modules/platform/plan-groups/services/plan-embed.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformMetadataService } from '@app/modules/platform/billing/stripe/services/stripe-platform-metadata.service';
import { StripePlatformSubscriptionService } from '@app/modules/platform/billing/stripe/services/stripe-platform-subscription.service';
import {
  BusinessPlanOptionsDto,
  BusinessPlanTierOptionDto,
} from '../dto/business-plan-options.dto';
import { CancelBusinessSubscriptionDto } from '../dto/cancel-business-subscription.dto';
import { CancelBusinessSubscriptionResponseDto } from '../dto/cancel-business-subscription-response.dto';
import { ChangeBusinessPlanTierDto } from '../dto/change-business-plan-tier.dto';
import { BusinessSubscriptionActionService } from './business-subscription-action.service';
import { BusinessSubscriptionEventService } from './business-subscription-event.service';
import { resolveWorkspacePlanGroupId } from '../utils/resolve-workspace-plan-group.util';

@Injectable()
export class BusinessBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedService: PlanEmbedService,
    private readonly subscriptionActionService: BusinessSubscriptionActionService,
    private readonly stripeSubscriptionService: StripePlatformSubscriptionService,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly eventService: BusinessSubscriptionEventService,
  ) {}

  async getCurrentPlanOptions(
    businessId: string,
  ): Promise<BusinessPlanOptionsDto> {
    const [subscription, business] = await Promise.all([
      this.prisma.businessSubscription.findUnique({
        where: { businessId },
        include: {
          planTier: { select: { id: true, slug: true } },
        },
      }),
      this.prisma.business.findFirst({
        where: { id: businessId, deletedAt: null },
        select: { snapshotId: true },
      }),
    ]);

    const planGroupId = await resolveWorkspacePlanGroupId(this.prisma, {
      subscriptionPlanGroupId: subscription?.planGroupId,
      snapshotId: business?.snapshotId,
    });

    if (!planGroupId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No plan group is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [pricing, tiers] = await Promise.all([
      this.embedService.buildPublicPricing(planGroupId),
      this.prisma.planTier.findMany({
        where: {
          planGroupId,
          deletedAt: null,
          status: PlanTierStatus.PUBLISHED,
        },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          sortOrder: true,
        },
      }),
    ]);

    const currentPlanTierId = subscription?.planTierId ?? null;
    const currentPlanTierSlug = subscription?.planTier?.slug ?? null;
    const currentPlanTierIndex = currentPlanTierId
      ? tiers.findIndex((tier) => tier.id === currentPlanTierId)
      : -1;

    return {
      pricing,
      tiers: tiers,
      currentPlanTierId,
      currentPlanTierSlug,
      currentPlanTierIndex,
    };
  }

  async changeCurrentPlanTier(
    businessId: string,
    dto: ChangeBusinessPlanTierDto,
    actor: RequestUser,
  ) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (!subscription?.planGroupId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No plan group is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (subscription.planTierId === dto.planTierId) {
      throw new AppException(
        ErrorCode.ALREADY_ON_TIER,
        'Already on this plan',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tier = await this.prisma.planTier.findFirst({
      where: {
        id: dto.planTierId,
        planGroupId: subscription.planGroupId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
      },
    });

    if (!tier) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan tier not found in your plan group',
        HttpStatus.NOT_FOUND,
      );
    }

    if (subscription.billingSource === SubscriptionBillingSource.STRIPE) {
      await this.stripeSubscriptionService.updateSubscriptionTier({
        businessId,
        planGroupId: subscription.planGroupId,
        planTierId: dto.planTierId,
        billingCycle: subscription.billingCycle ?? ('MONTHLY' as const),
      });
    }

    return this.subscriptionActionService.changePackage(
      businessId,
      {
        planGroupId: subscription.planGroupId,
        planTierId: dto.planTierId,
        billingCycle: subscription.billingCycle ?? undefined,
        syncCapabilities: true,
        paymentOption: 'keep_status',
        reason: 'Self-service plan change',
      },
      actor,
    );
  }

  async cancelCurrentSubscription(
    businessId: string,
    dto: CancelBusinessSubscriptionDto,
    actor: RequestUser,
  ): Promise<CancelBusinessSubscriptionResponseDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No subscription is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (subscription.billingSource === SubscriptionBillingSource.INTERNAL) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Internal subscriptions cannot be canceled through billing.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const reason = dto.reason?.trim() || 'Self-service cancellation';

    if (subscription.billingSource === SubscriptionBillingSource.STRIPE) {
      const before = await this.eventService.captureState(businessId);
      const correlationId = randomUUID();

      await this.stripeSubscriptionService.cancelAtPeriodEnd(businessId, reason);

      const after = await this.eventService.captureState(businessId);
      await this.eventService.createEvent(
        this.prisma,
        {
          businessId,
          subscriptionId: subscription.id,
          eventType: BusinessSubscriptionEventType.CANCELLATION_SCHEDULED,
          actionKey: 'CANCEL_SUBSCRIPTION',
          correlationId,
          fromState: before,
          toState: after,
          reason,
          source: BusinessSubscriptionEventSource.ADMIN,
        },
        actor,
      );

      return this.buildCancelResponse(businessId, subscription.id);
    }

    await this.subscriptionActionService.cancelSubscription(
      businessId,
      actor,
      reason,
    );

    return this.buildCancelResponse(businessId, subscription.id);
  }

  async resumeCurrentSubscription(
    businessId: string,
    actor: RequestUser,
  ): Promise<CancelBusinessSubscriptionResponseDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No subscription is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (subscription.billingSource !== SubscriptionBillingSource.STRIPE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe billing is not active for this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const before = await this.eventService.captureState(businessId);
    const correlationId = randomUUID();

    await this.stripeSubscriptionService.resumeSubscription(businessId);

    const after = await this.eventService.captureState(businessId);
    await this.eventService.createEvent(
      this.prisma,
      {
        businessId,
        subscriptionId: subscription.id,
        eventType: BusinessSubscriptionEventType.REACTIVATED,
        title: 'Cancellation reversed',
        actionKey: 'RESUME_SUBSCRIPTION',
        correlationId,
        fromState: before,
        toState: after,
        reason: 'Self-service subscription resume',
        source: BusinessSubscriptionEventSource.ADMIN,
      },
      actor,
    );

    return this.buildCancelResponse(businessId, subscription.id);
  }

  private async buildCancelResponse(
    businessId: string,
    subscriptionId: string,
  ): Promise<CancelBusinessSubscriptionResponseDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    if (!subscription) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No subscription is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const stripeMeta = this.metadataService.parseSubscriptionStripeMetadata(
      subscription.metadata,
    );

    return {
      businessId,
      subscriptionId,
      status: subscription.status,
      billingSource: subscription.billingSource,
      paymentMethod: subscription.paymentMethod,
      paymentStatus: subscription.paymentStatus,
      billingCycle: subscription.billingCycle,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: stripeMeta?.cancelAtPeriodEnd ?? false,
      cancelAt: stripeMeta?.cancelAt ? new Date(stripeMeta.cancelAt) : null,
    };
  }
}
