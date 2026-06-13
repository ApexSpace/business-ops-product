import { HttpStatus, Injectable } from '@nestjs/common';
import { PlanTierStatus, SubscriptionBillingSource } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PlanEmbedService } from '@app/modules/platform/plan-groups/services/plan-embed.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformSubscriptionService } from '@app/modules/platform/billing/stripe/services/stripe-platform-subscription.service';
import {
  BusinessPlanOptionsDto,
  BusinessPlanTierOptionDto,
} from '../dto/business-plan-options.dto';
import { CancelBusinessSubscriptionDto } from '../dto/cancel-business-subscription.dto';
import { ChangeBusinessPlanTierDto } from '../dto/change-business-plan-tier.dto';
import { BusinessSubscriptionActionService } from './business-subscription-action.service';

@Injectable()
export class BusinessBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedService: PlanEmbedService,
    private readonly subscriptionActionService: BusinessSubscriptionActionService,
    private readonly stripeSubscriptionService: StripePlatformSubscriptionService,
  ) {}

  async getCurrentPlanOptions(
    businessId: string,
  ): Promise<BusinessPlanOptionsDto> {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: {
        planTier: { select: { id: true, slug: true } },
      },
    });

    if (!subscription?.planGroupId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No plan group is assigned to this workspace',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [pricing, tiers] = await Promise.all([
      this.embedService.buildPublicPricing(subscription.planGroupId),
      this.prisma.planTier.findMany({
        where: {
          planGroupId: subscription.planGroupId,
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

    const currentPlanTierId = subscription.planTierId ?? null;
    const currentPlanTierSlug = subscription.planTier?.slug ?? null;
    const currentPlanTierIndex = currentPlanTierId
      ? tiers.findIndex((tier) => tier.id === currentPlanTierId)
      : -1;

    return {
      pricing,
      tiers: tiers as BusinessPlanTierOptionDto[],
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
        ErrorCode.BAD_REQUEST,
        'This plan is already active on your workspace',
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
        billingCycle:
          subscription.billingCycle ?? ('MONTHLY' as const),
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
  ) {
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

    if (subscription.billingSource === SubscriptionBillingSource.STRIPE) {
      const result = await this.stripeSubscriptionService.cancelAtPeriodEnd(
        businessId,
        dto.reason?.trim() || 'Self-service cancellation',
      );
      return { businessId, ...result } as { businessId: string; cancelAtPeriodEnd: boolean };
    }

    return this.subscriptionActionService.cancelSubscription(
      businessId,
      actor,
      dto.reason?.trim() || 'Self-service cancellation',
    );
  }
}
