import {
  BusinessSubscriptionBillingCycle,
  SubscriptionStatus,
} from '@prisma/client';

export type SubscriptionPeriodResult = {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextBillingDate: Date | null;
  nextBillingLabel: string;
};

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() < day) {
    result.setUTCDate(0);
  }
  return result;
}

export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function parseDate(value?: Date | string | null): Date | null {
  if (value == null || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function resolveNextBillingLabel(
  status: SubscriptionStatus,
): string {
  switch (status) {
    case SubscriptionStatus.TRIALING:
      return 'Trial ends';
    case SubscriptionStatus.ACTIVE:
      return 'Next billing date';
    case SubscriptionStatus.PENDING_PAYMENT:
    case SubscriptionStatus.PAST_DUE:
      return 'Payment due';
    case SubscriptionStatus.INTERNAL:
      return 'No billing required';
    case SubscriptionStatus.CANCELED:
      return 'Ended';
    case SubscriptionStatus.EXPIRED:
      return 'Expired';
    default:
      return 'Next billing date';
  }
}

export function calculateSubscriptionPeriod(params: {
  billingCycle?: BusinessSubscriptionBillingCycle | null;
  startDate?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  trialDays?: number | null;
  subscriptionStatus: SubscriptionStatus;
}): SubscriptionPeriodResult {
  const {
    billingCycle,
    startDate,
    currentPeriodEnd,
    trialDays,
    subscriptionStatus,
  } = params;

  const nextBillingLabel = resolveNextBillingLabel(subscriptionStatus);

  if (subscriptionStatus === SubscriptionStatus.INTERNAL) {
    return {
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextBillingDate: null,
      nextBillingLabel,
    };
  }

  if (subscriptionStatus === SubscriptionStatus.TRIALING) {
    const periodStart = parseDate(startDate) ?? startOfUtcDay(new Date());
    const explicitEnd = parseDate(currentPeriodEnd);
    const periodEnd =
      explicitEnd ??
      (trialDays && trialDays > 0
        ? (() => {
            const end = new Date(periodStart);
            end.setUTCDate(end.getUTCDate() + trialDays);
            return end;
          })()
        : null);

    return {
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      nextBillingDate: periodEnd,
      nextBillingLabel,
    };
  }

  const periodStart = parseDate(startDate) ?? startOfUtcDay(new Date());
  const explicitEnd = parseDate(currentPeriodEnd);

  if (subscriptionStatus === SubscriptionStatus.PENDING_PAYMENT) {
    return {
      currentPeriodStart: periodStart,
      currentPeriodEnd: explicitEnd,
      nextBillingDate: explicitEnd,
      nextBillingLabel,
    };
  }

  if (billingCycle === BusinessSubscriptionBillingCycle.ONE_TIME) {
    return {
      currentPeriodStart: periodStart,
      currentPeriodEnd: explicitEnd ?? periodStart,
      nextBillingDate: null,
      nextBillingLabel,
    };
  }

  if (billingCycle === BusinessSubscriptionBillingCycle.CUSTOM) {
    return {
      currentPeriodStart: periodStart,
      currentPeriodEnd: explicitEnd,
      nextBillingDate: explicitEnd,
      nextBillingLabel,
    };
  }

  if (explicitEnd) {
    return {
      currentPeriodStart: periodStart,
      currentPeriodEnd: explicitEnd,
      nextBillingDate: explicitEnd,
      nextBillingLabel,
    };
  }

  let periodEnd: Date | null = null;
  if (billingCycle === BusinessSubscriptionBillingCycle.MONTHLY) {
    periodEnd = addMonths(periodStart, 1);
  } else if (billingCycle === BusinessSubscriptionBillingCycle.YEARLY) {
    periodEnd = addYears(periodStart, 1);
  }

  return {
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    nextBillingDate: periodEnd,
    nextBillingLabel,
  };
}
