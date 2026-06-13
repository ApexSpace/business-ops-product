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

export type NeedsAttentionFlag =
  | "TRIAL_EXPIRED"
  | "PENDING_PAYMENT"
  | "ACTIVE_WITH_EXPIRED_SUBSCRIPTION"
  | "ACTIVE_WITH_CANCELED_SUBSCRIPTION"
  | "NO_PLAN_TIER"
  | "NO_CAPABILITIES"
  | "SNAPSHOT_NOT_APPLIED"
  | "OWNER_INVITED_WHILE_INACTIVE";

export interface TenantEffectiveCapability {
  id: string;
  key: string;
  name: string;
  description?: string | null;
}

export interface TenantAccessSubscription {
  id: string;
  status: string;
  planGroupId?: string | null;
  planGroupName?: string | null;
  planTierId?: string | null;
  planTierName?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  billingSource?: string;
  billingCycle?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  amount?: string | null;
  currency?: string | null;
}

export interface BusinessTenantAccess {
  businessId: string;
  businessName: string;
  businessStatus: string;
  canAccessWorkspace: boolean;
  reasonCode: BusinessAccessReasonCode;
  reasonLabel: string;
  warnings: string[];
  needsAttention: NeedsAttentionFlag[];
  subscription?: TenantAccessSubscription | null;
  effectiveCapabilities: TenantEffectiveCapability[];
}
