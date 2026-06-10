export type SubscriptionActionKey =
  | 'MARK_PAID'
  | 'RECORD_PAYMENT'
  | 'MOVE_PENDING'
  | 'EXTEND_TRIAL'
  | 'CANCEL_SUBSCRIPTION'
  | 'EXPIRE_TRIAL'
  | 'SUSPEND_BUSINESS'
  | 'REACTIVATE_BUSINESS'
  | 'CHANGE_PACKAGE'
  | 'CHANGE_SNAPSHOT'
  | 'SYNC_CAPABILITIES'
  | 'MANUAL_ADJUSTMENT';

export type SubscriptionActionCategory =
  | 'recommended'
  | 'billing'
  | 'trial'
  | 'access'
  | 'package'
  | 'snapshot'
  | 'danger';

export type SubscriptionActionSeverity = 'safe' | 'warning' | 'danger';

export type SubscriptionActionDefinition = {
  key: SubscriptionActionKey;
  label: string;
  description?: string;
  category: SubscriptionActionCategory;
  visible: boolean;
  enabled: boolean;
  disabledReason?: string;
  severity: SubscriptionActionSeverity;
  requiresConfirmation: boolean;
  requiresInput: boolean;
  reason?: string;
};

export type CapabilityDiffItem = {
  id: string;
  key: string;
  name: string;
};

export type CapabilityDiff = {
  added: CapabilityDiffItem[];
  removed: CapabilityDiffItem[];
  unchanged: CapabilityDiffItem[];
  preservedCustomManual: CapabilityDiffItem[];
};

export type CapabilityDiffSummary = {
  added: string[];
  removed: string[];
  unchanged: string[];
  preservedCustomManual: string[];
};
