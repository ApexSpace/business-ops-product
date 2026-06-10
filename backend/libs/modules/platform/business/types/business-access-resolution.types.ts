export type NeedsAttentionFlag =
  | 'TRIAL_EXPIRED'
  | 'PENDING_PAYMENT'
  | 'ACTIVE_WITH_EXPIRED_SUBSCRIPTION'
  | 'ACTIVE_WITH_CANCELED_SUBSCRIPTION'
  | 'NO_PLAN_TIER'
  | 'NO_CAPABILITIES'
  | 'SNAPSHOT_NOT_APPLIED'
  | 'OWNER_INVITED_WHILE_INACTIVE';

export type BusinessAccessReasonCode =
  | 'ACCESS_GRANTED'
  | 'BUSINESS_SUSPENDED'
  | 'BUSINESS_NOT_ACTIVE'
  | 'NO_SUBSCRIPTION'
  | 'SUBSCRIPTION_ACTIVE'
  | 'SUBSCRIPTION_TRIALING'
  | 'TRIAL_EXPIRED'
  | 'SUBSCRIPTION_INTERNAL'
  | 'SUBSCRIPTION_PENDING_PAYMENT'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_PAST_DUE'
  | 'SUBSCRIPTION_UNKNOWN';

export interface EffectiveCapability {
  key: string;
  name: string;
}

export interface BusinessAccessResolution {
  canAccessWorkspace: boolean;
  reasonCode: BusinessAccessReasonCode;
  reasonLabel: string;
  warnings: string[];
  needsAttention: NeedsAttentionFlag[];
  effectiveCapabilities: EffectiveCapability[];
}
