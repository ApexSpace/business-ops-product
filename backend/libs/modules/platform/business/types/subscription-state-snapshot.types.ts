import {
  BusinessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

export type SubscriptionStateSnapshot = {
  businessStatus: BusinessStatus;
  subscriptionStatus?: SubscriptionStatus | null;
  paymentMethod?: SubscriptionPaymentMethod | null;
  paymentStatus?: SubscriptionPaymentStatus | null;

  planGroupId?: string | null;
  planTierId?: string | null;
  planTierName?: string | null;
  billingCycle?: string | null;

  snapshotId?: string | null;
  snapshotName?: string | null;
  snapshotAppliedAt?: string | null;

  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;

  amount?: string | null;
  currency?: string | null;

  capabilityKeys?: string[];

  accessResolution?: {
    canAccessWorkspace: boolean;
    reasonCode: string;
    reasonLabel: string;
    warnings: string[];
  };
};
