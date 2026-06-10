import type { SubscriptionActionDefinition } from "./business-subscription";

export type BusinessAccessStatus = "ACTIVE" | "NOT_ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type SubscriptionAccessStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PENDING_PAYMENT"
  | "CANCELED"
  | "EXPIRED"
  | "INTERNAL"
  | "PAST_DUE";

export type SubscriptionPaymentMethod =
  | "STRIPE"
  | "BANK_TRANSFER"
  | "WISE"
  | "PAYPAL"
  | "CASH"
  | "JAZZCASH"
  | "EASYPAISA"
  | "MANUAL_INVOICE"
  | "FREE_INTERNAL"
  | "NOT_SELECTED";

export type SubscriptionPaymentStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_PAID"
  | "OVERDUE";

export type BusinessCapabilitySource = "PLAN_TIER" | "CUSTOM" | "MANUAL";

export type BusinessCapabilityAssignmentStatus = "ACTIVE" | "DISABLED";

export type NeedsAttentionFlag =
  | "TRIAL_EXPIRED"
  | "PENDING_PAYMENT"
  | "ACTIVE_WITH_EXPIRED_SUBSCRIPTION"
  | "ACTIVE_WITH_CANCELED_SUBSCRIPTION"
  | "NO_PLAN_TIER"
  | "NO_CAPABILITIES"
  | "SNAPSHOT_NOT_APPLIED"
  | "OWNER_INVITED_WHILE_INACTIVE";

export type BusinessAccessReasonCode =
  | "ACCESS_GRANTED"
  | "BUSINESS_SUSPENDED"
  | "BUSINESS_NOT_ACTIVE"
  | "NO_SUBSCRIPTION"
  | "SUBSCRIPTION_ACTIVE"
  | "SUBSCRIPTION_TRIALING"
  | "TRIAL_EXPIRED"
  | "SUBSCRIPTION_INTERNAL"
  | "SUBSCRIPTION_PENDING_PAYMENT"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_CANCELED"
  | "SUBSCRIPTION_PAST_DUE"
  | "SUBSCRIPTION_UNKNOWN";

export interface BusinessAccessResolution {
  canAccessWorkspace: boolean;
  reasonCode: BusinessAccessReasonCode;
  reasonLabel: string;
  warnings: string[];
  needsAttention: NeedsAttentionFlag[];
  effectiveCapabilities: { key: string; name: string }[];
}

export interface BusinessAccessSubscription {
  id: string;
  status: SubscriptionAccessStatus;
  planGroupId?: string | null;
  planGroupName?: string | null;
  planTierId?: string | null;
  planTierName?: string | null;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  amount?: string | null;
  currency?: string | null;
  suggestedAmount?: string | null;
  suggestedCurrency?: string | null;
  billingCycle?: string | null;
  nextBillingDate?: string | null;
  nextBillingLabel?: string | null;
  notes?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCapabilityAssignment {
  id: string;
  capabilityId: string;
  key: string;
  name: string;
  description?: string | null;
  source: BusinessCapabilitySource;
  status: BusinessCapabilityAssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessAccess {
  businessId: string;
  businessStatus: BusinessAccessStatus;
  snapshotId?: string | null;
  snapshotName?: string | null;
  snapshotAppliedAt?: string | null;
  subscription?: BusinessAccessSubscription | null;
  capabilities: BusinessCapabilityAssignment[];
  resolution: BusinessAccessResolution;
  availableActions?: SubscriptionActionDefinition[];
  recommendedAction?: SubscriptionActionDefinition | null;
}

export interface UpdateBusinessAccessInput {
  businessStatus?: BusinessAccessStatus;
  snapshotId?: string;
  planGroupId?: string | null;
  planTierId?: string | null;
  subscriptionStatus?: SubscriptionAccessStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentStatus?: SubscriptionPaymentStatus;
  billingCycle?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  syncCapabilitiesFromTier?: boolean;
  applySnapshot?: boolean;
  reason?: string;
  adminNotes?: string;
}

export interface CreateBusinessAccessInput {
  status?: BusinessAccessStatus;
  planGroupId?: string;
  planTierId?: string;
  subscriptionStatus?: SubscriptionAccessStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentStatus?: SubscriptionPaymentStatus;
  billingCycle?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  amount?: number;
  currency?: string;
  notes?: string;
  syncCapabilitiesFromTier?: boolean;
  inviteOwner?: boolean;
}
