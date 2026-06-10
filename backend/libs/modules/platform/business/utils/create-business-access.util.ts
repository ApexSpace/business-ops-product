import {
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import type { BusinessAccessCreateFieldsDto } from '../dto/business-access.dto';
import { addMonths, addYears } from './calculate-subscription-period.util';

export type UnpaidAccessMode = 'TRIAL' | 'PENDING_PAYMENT' | 'INTERNAL';

export type CreateBusinessAccessInput = BusinessAccessCreateFieldsDto & {
  paymentCollected?: boolean;
  unpaidAccessMode?: UnpaidAccessMode;
};

export type ResolvedCreateBusinessAccess = {
  status: BusinessStatus;
  subscriptionStatus: SubscriptionStatus;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  billingCycle?: BusinessSubscriptionBillingCycle;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  syncCapabilitiesFromTier: boolean;
  recordInitialPayment: boolean;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function computePeriodEndFromBillingCycle(
  billingCycle: BusinessSubscriptionBillingCycle,
  startDate: string,
): string | undefined {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return undefined;

  switch (billingCycle) {
    case BusinessSubscriptionBillingCycle.MONTHLY:
      return addMonths(start, 1).toISOString().slice(0, 10);
    case BusinessSubscriptionBillingCycle.YEARLY:
      return addYears(start, 1).toISOString().slice(0, 10);
    case BusinessSubscriptionBillingCycle.ONE_TIME:
      return startDate;
    default:
      return undefined;
  }
}

function usesSimpleCreateFlow(dto: CreateBusinessAccessInput): boolean {
  return (
    dto.paymentCollected !== undefined || dto.unpaidAccessMode !== undefined
  );
}

function hasExplicitAccessFields(dto: CreateBusinessAccessInput): boolean {
  return (
    dto.status !== undefined ||
    dto.planGroupId !== undefined ||
    dto.planTierId !== undefined ||
    dto.subscriptionStatus !== undefined ||
    dto.paymentMethod !== undefined ||
    dto.paymentStatus !== undefined ||
    dto.billingCycle !== undefined ||
    dto.currentPeriodStart !== undefined ||
    dto.currentPeriodEnd !== undefined ||
    dto.amount !== undefined ||
    dto.currency !== undefined ||
    dto.notes !== undefined
  );
}

export function resolveCreateBusinessAccess(
  dto: CreateBusinessAccessInput,
): ResolvedCreateBusinessAccess | null {
  if (!usesSimpleCreateFlow(dto) && !hasExplicitAccessFields(dto)) {
    return null;
  }

  if (usesSimpleCreateFlow(dto)) {
    const today = todayIsoDate();
    const syncCapabilitiesFromTier =
      dto.syncCapabilitiesFromTier ?? Boolean(dto.planTierId);

    if (dto.paymentCollected === true) {
      const periodStart = dto.currentPeriodStart ?? today;
      const billingCycle = dto.billingCycle;
      const periodEnd =
        dto.currentPeriodEnd ??
        (billingCycle &&
        billingCycle !== BusinessSubscriptionBillingCycle.CUSTOM
          ? computePeriodEndFromBillingCycle(billingCycle, periodStart)
          : undefined);

      const paymentMethod =
        dto.paymentMethod &&
        dto.paymentMethod !== SubscriptionPaymentMethod.NOT_SELECTED
          ? dto.paymentMethod
          : SubscriptionPaymentMethod.MANUAL_INVOICE;

      return {
        status: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentMethod,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        billingCycle,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        syncCapabilitiesFromTier,
        recordInitialPayment:
          dto.recordInitialPayment !== false &&
          dto.amount != null &&
          dto.amount > 0,
      };
    }

    const mode = dto.unpaidAccessMode ?? 'TRIAL';

    switch (mode) {
      case 'TRIAL': {
        return {
          status: BusinessStatus.ACTIVE,
          subscriptionStatus: SubscriptionStatus.TRIALING,
          paymentMethod: SubscriptionPaymentMethod.NOT_SELECTED,
          paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
          billingCycle:
            dto.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY,
          currentPeriodStart: dto.currentPeriodStart ?? today,
          currentPeriodEnd: dto.currentPeriodEnd,
          syncCapabilitiesFromTier,
          recordInitialPayment: false,
        };
      }
      case 'PENDING_PAYMENT': {
        return {
          status: BusinessStatus.NOT_ACTIVE,
          subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
          paymentMethod:
            dto.paymentMethod ?? SubscriptionPaymentMethod.MANUAL_INVOICE,
          paymentStatus: SubscriptionPaymentStatus.PENDING,
          billingCycle: dto.billingCycle,
          currentPeriodStart: dto.currentPeriodStart,
          currentPeriodEnd: dto.currentPeriodEnd,
          syncCapabilitiesFromTier,
          recordInitialPayment: false,
        };
      }
      case 'INTERNAL': {
        return {
          status: BusinessStatus.ACTIVE,
          subscriptionStatus: SubscriptionStatus.INTERNAL,
          paymentMethod: SubscriptionPaymentMethod.FREE_INTERNAL,
          paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
          syncCapabilitiesFromTier,
          recordInitialPayment: false,
        };
      }
      default:
        break;
    }
  }

  return {
    status: dto.status ?? BusinessStatus.ACTIVE,
    subscriptionStatus: dto.subscriptionStatus ?? SubscriptionStatus.TRIALING,
    paymentMethod: dto.paymentMethod ?? SubscriptionPaymentMethod.NOT_SELECTED,
    paymentStatus: dto.paymentStatus ?? SubscriptionPaymentStatus.NOT_REQUIRED,
    billingCycle: dto.billingCycle,
    currentPeriodStart: dto.currentPeriodStart,
    currentPeriodEnd: dto.currentPeriodEnd,
    syncCapabilitiesFromTier:
      dto.syncCapabilitiesFromTier ?? Boolean(dto.planTierId),
    recordInitialPayment:
      dto.recordInitialPayment !== false &&
      dto.paymentStatus === SubscriptionPaymentStatus.PAID &&
      dto.amount != null &&
      dto.amount > 0,
  };
}
