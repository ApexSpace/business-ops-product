import { HttpStatus, Injectable } from '@nestjs/common';
import { PlanTierStatus, SubscriptionBillingSource } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PlanEmbedService } from '@app/modules/platform/plan-groups/services/plan-embed.service';
import { PrismaService } from '@app/core/database/prisma.service';
import { StripePlatformSubscriptionService } from '@app/modules/platform/billing/stripe/services/stripe-platform-subscription.service';
import { StripePlatformPlanChangeService } from '@app/modules/platform/billing/stripe/services/stripe-platform-plan-change.service';
import {
  BusinessPlanOptionsDto,
} from '../dto/business-plan-options.dto';
import { CancelBusinessSubscriptionDto } from '../dto/cancel-business-subscription.dto';
import { ChangeBusinessPlanTierDto } from '../dto/change-business-plan-tier.dto';
import { BusinessSubscriptionActionService } from './business-subscription-action.service';
import { BusinessProvisioningService } from './business-provisioning.service';

@Injectable()
export class BusinessBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedService: PlanEmbedService,
    private readonly subscriptionActionService: BusinessSubscriptionActionService,
    private readonly stripeSubscriptionService: StripePlatformSubscriptionService,
    private readonly stripePlanChange: StripePlatformPlanChangeService,
    private readonly provisioning: BusinessProvisioningService,
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

    // Prefer legacy plan-group pricing when still assigned; otherwise list public tiers
    if (subscription?.planGroupId) {
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
        tiers,
        currentPlanTierId,
        currentPlanTierSlug,
        currentPlanTierIndex,
      };
    }

    const tiers = await this.prisma.planTier.findMany({
      where: {
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
        isPublic: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        sortOrder: true,
        priceMonthly: true,
        priceYearly: true,
        currency: true,
        description: true,
      },
    });

    const currentPlanTierId = subscription?.planTierId ?? null;
    const currentPlanTierSlug = subscription?.planTier?.slug ?? null;
    const currentPlanTierIndex = currentPlanTierId
      ? tiers.findIndex((tier) => tier.id === currentPlanTierId)
      : -1;

    return {
      pricing: {
        id: 'public-tiers',
        name: 'Plans',
        currency: tiers[0]?.currency ?? 'USD',
        billingCycles: ['MONTHLY', 'YEARLY'],
        embed: {} as BusinessPlanOptionsDto['pricing']['embed'],
        designSettings: {} as BusinessPlanOptionsDto['pricing']['designSettings'],
        tiers: tiers.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          description: t.description,
          priceMonthly: t.priceMonthly ? Number(t.priceMonthly) : null,
          priceYearly: t.priceYearly ? Number(t.priceYearly) : null,
          sortOrder: t.sortOrder,
          features: [],
        })) as unknown as BusinessPlanOptionsDto['pricing']['tiers'],
        featureRows: [],
      },
      tiers: tiers.map(({ id, slug, name, sortOrder }) => ({
        id,
        slug,
        name,
        sortOrder,
      })),
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

    if (!subscription) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'No subscription is assigned to this workspace',
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

    const impact = await this.provisioning.previewTierChange(
      businessId,
      dto.planTierId,
    );
    if (impact.blocked) {
      throw new AppException(
        ErrorCode.TIER_LIMIT_EXCEEDED,
        impact.blockReason ?? 'Cannot switch to this tier',
        HttpStatus.BAD_REQUEST,
      );
    }

    const tier = await this.prisma.planTier.findFirst({
      where: {
        id: dto.planTierId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
        ...(subscription.planGroupId
          ? { planGroupId: subscription.planGroupId }
          : { isPublic: true }),
      },
    });

    if (!tier) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Tier not found or not available',
        HttpStatus.NOT_FOUND,
      );
    }

    if (subscription.billingSource === SubscriptionBillingSource.STRIPE) {
      // Stripe owns the subscription; webhook mirror applies local tier/addons.
      const result = await this.stripePlanChange.changePlan(
        businessId,
        dto.planTierId,
      );
      return {
        businessId,
        planTierId: dto.planTierId,
        requested: true as const,
        preview: result.preview,
        lostDependentAddons: impact.lostDependentAddons,
      };
    }

    await this.provisioning.changeTier({
      businessId,
      tierId: dto.planTierId,
      actor,
      billingCycle: subscription.billingCycle ?? undefined,
    });

    return {
      businessId,
      planTierId: dto.planTierId,
      lostDependentAddons: impact.lostDependentAddons,
    };
  }

  async previewCurrentPlanChange(businessId: string, tierId: string) {
    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });
    const impact = await this.provisioning.previewTierChange(
      businessId,
      tierId,
    );
    if (subscription?.billingSource === SubscriptionBillingSource.STRIPE) {
      const stripePreview = await this.stripePlanChange.previewPlanChange(
        businessId,
        tierId,
      );
      return { ...impact, stripe: stripePreview };
    }
    return { ...impact, stripe: null };
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
      return { businessId, ...result };
    }

    return this.subscriptionActionService.cancelSubscription(
      businessId,
      actor,
      dto.reason?.trim() || 'Self-service cancellation',
    );
  }
}
