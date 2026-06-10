import {
  BusinessSubscriptionBillingCycle,
  SubscriptionStatus,
} from '@prisma/client';
import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { resolveTierPrice, type TierPriceFields } from './resolve-tier-price.util';

export function assertBillingCycleRequired(
  status: SubscriptionStatus,
  billingCycle?: BusinessSubscriptionBillingCycle | null,
): void {
  if (status === SubscriptionStatus.INTERNAL) {
    return;
  }
  if (
    (status === SubscriptionStatus.ACTIVE ||
      status === SubscriptionStatus.TRIALING) &&
    !billingCycle
  ) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Billing cycle is required for active or trialing subscriptions',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertTierPriceOrCustomAmount(params: {
  billingCycle: BusinessSubscriptionBillingCycle;
  tier: TierPriceFields | null;
  amount?: number | null;
  currency?: string | null;
  customPrice?: boolean;
  keepCurrentPrice?: boolean;
}): void {
  const { billingCycle, tier, amount, currency, customPrice, keepCurrentPrice } =
    params;

  if (keepCurrentPrice) {
    return;
  }

  if (billingCycle === BusinessSubscriptionBillingCycle.CUSTOM) {
    if (amount == null) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Custom billing cycle requires an amount',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!currency?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Custom billing cycle requires a currency',
        HttpStatus.BAD_REQUEST,
      );
    }
    return;
  }

  if (customPrice && amount != null) {
    return;
  }

  const resolved = resolveTierPrice(tier, billingCycle, { currency });
  if (resolved.amount == null && amount == null) {
    const label =
      billingCycle === BusinessSubscriptionBillingCycle.MONTHLY
        ? 'monthly'
        : billingCycle === BusinessSubscriptionBillingCycle.YEARLY
          ? 'yearly'
          : 'one-time';
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Selected tier is missing a ${label} price. Provide a custom amount.`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertCustomPeriodEndRequired(
  billingCycle: BusinessSubscriptionBillingCycle | null | undefined,
  currentPeriodEnd?: string | Date | null,
): void {
  if (
    billingCycle === BusinessSubscriptionBillingCycle.CUSTOM &&
    !currentPeriodEnd
  ) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      'Period end is required for custom billing cycle',
      HttpStatus.BAD_REQUEST,
    );
  }
}
