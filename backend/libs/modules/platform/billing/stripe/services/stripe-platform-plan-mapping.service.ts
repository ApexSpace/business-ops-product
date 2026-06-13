import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionBillingCycle,
  PlanTierStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import type { PlanTierStripeMetadata } from '../types/stripe-platform-billing.types';

@Injectable()
export class StripePlatformPlanMappingService {
  constructor(private readonly prisma: PrismaService) {}

  parseTierStripeMetadata(metadata: unknown): PlanTierStripeMetadata | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const root = metadata as Record<string, unknown>;
    const stripe =
      root.stripe && typeof root.stripe === 'object' && !Array.isArray(root.stripe)
        ? (root.stripe as Record<string, unknown>)
        : null;
    if (!stripe) return null;

    return {
      productId:
        typeof stripe.productId === 'string' ? stripe.productId : undefined,
      monthlyPriceId:
        typeof stripe.monthlyPriceId === 'string'
          ? stripe.monthlyPriceId
          : undefined,
      yearlyPriceId:
        typeof stripe.yearlyPriceId === 'string'
          ? stripe.yearlyPriceId
          : undefined,
    };
  }

  buildTierStripeMetadata(
    input: PlanTierStripeMetadata,
  ): Record<string, unknown> {
    const stripe: Record<string, unknown> = {};
    if (input.productId) stripe.productId = input.productId;
    if (input.monthlyPriceId) stripe.monthlyPriceId = input.monthlyPriceId;
    if (input.yearlyPriceId) stripe.yearlyPriceId = input.yearlyPriceId;
    return { stripe };
  }

  mergeTierMetadata(
    existing: unknown,
    stripeInput: PlanTierStripeMetadata,
  ): Record<string, unknown> {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    const currentStripe = this.parseTierStripeMetadata(base) ?? {};
    return {
      ...base,
      stripe: {
        ...currentStripe,
        ...stripeInput,
      },
    };
  }

  resolvePriceId(
    stripeMeta: PlanTierStripeMetadata | null,
    billingCycle: BusinessSubscriptionBillingCycle,
  ): string | null {
    if (!stripeMeta) return null;
    if (billingCycle === BusinessSubscriptionBillingCycle.YEARLY) {
      return stripeMeta.yearlyPriceId ?? null;
    }
    if (billingCycle === BusinessSubscriptionBillingCycle.MONTHLY) {
      return stripeMeta.monthlyPriceId ?? null;
    }
    return null;
  }

  tierHasStripePrice(stripeMeta: PlanTierStripeMetadata | null): boolean {
    return Boolean(
      stripeMeta?.monthlyPriceId?.trim() || stripeMeta?.yearlyPriceId?.trim(),
    );
  }

  async resolvePublishedTierPrice(
    planGroupId: string,
    planTierId: string,
    billingCycle: BusinessSubscriptionBillingCycle,
  ): Promise<{
    tier: {
      id: string;
      name: string;
      metadata: unknown;
      planGroup: { id: string; currency: string };
    };
    stripeMeta: PlanTierStripeMetadata;
    priceId: string;
    productId: string | null;
  }> {
    const tier = await this.prisma.planTier.findFirst({
      where: {
        id: planTierId,
        planGroupId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
      },
      include: {
        planGroup: { select: { id: true, currency: true } },
      },
    });

    if (!tier) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Plan tier not found or not published',
        HttpStatus.NOT_FOUND,
      );
    }

    const stripeMeta = this.parseTierStripeMetadata(tier.metadata);
    const priceId = this.resolvePriceId(stripeMeta, billingCycle);

    if (!priceId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `No Stripe price configured for ${billingCycle} billing on this tier`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      tier,
      stripeMeta: stripeMeta ?? {},
      priceId,
      productId: stripeMeta?.productId ?? null,
    };
  }
}
