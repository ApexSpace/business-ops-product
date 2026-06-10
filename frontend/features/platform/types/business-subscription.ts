import type {
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "./business-access";

export type SubscriptionActionKey =
  | "MARK_PAID"
  | "RECORD_PAYMENT"
  | "MOVE_PENDING"
  | "EXTEND_TRIAL"
  | "CANCEL_SUBSCRIPTION"
  | "EXPIRE_TRIAL"
  | "SUSPEND_BUSINESS"
  | "REACTIVATE_BUSINESS"
  | "CHANGE_PACKAGE"
  | "CHANGE_SNAPSHOT"
  | "SYNC_CAPABILITIES"
  | "MANUAL_ADJUSTMENT";

export type SubscriptionActionCategory =
  | "recommended"
  | "billing"
  | "trial"
  | "access"
  | "package"
  | "snapshot"
  | "danger";

export type SubscriptionActionSeverity = "safe" | "warning" | "danger";

export interface SubscriptionActionDefinition {
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
}

export interface SubscriptionStateSnapshot {
  businessStatus: BusinessAccessStatus;
  subscriptionStatus?: SubscriptionAccessStatus | null;
  paymentMethod?: SubscriptionPaymentMethod | null;
  paymentStatus?: SubscriptionPaymentStatus | null;
  planGroupId?: string | null;
  planGroupName?: string | null;
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
}

export interface PreviewActionInput {
  actionKey: SubscriptionActionKey;
  input?: Record<string, unknown>;
}

export interface PreviewActionResult {
  actionKey: string;
  allowed: boolean;
  reason?: string;
  beforeState: SubscriptionStateSnapshot;
  afterState: SubscriptionStateSnapshot;
  accessImpact: {
    beforeCanAccess: boolean;
    afterCanAccess: boolean;
    beforeReason: string;
    afterReason: string;
  };
  paymentImpact?: {
    createsPaymentRecord: boolean;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    paymentType?: string;
  };
  capabilityDiff?: {
    added: Array<{ id: string; key: string; name: string }>;
    removed: Array<{ id: string; key: string; name: string }>;
    unchanged: Array<{ id: string; key: string; name: string }>;
    preservedCustomManual: Array<{ id: string; key: string; name: string }>;
  };
  snapshotImpact?: {
    oldSnapshotId?: string | null;
    newSnapshotId?: string | null;
    applySnapshot: boolean;
    mayOverwriteConfiguration: boolean;
  };
  warnings: string[];
  requiresConfirmation: boolean;
}

export type ChangePackagePaymentOption =
  | "no_payment"
  | "record_payment"
  | "move_pending"
  | "keep_status";

export interface MarkPaidInput {
  amount?: number;
  currency?: string;
  paymentMethod?: SubscriptionPaymentMethod;
  periodStart?: string;
  periodEnd?: string;
  paidAt?: string;
  paymentReference?: string;
  skipPaymentRecord?: boolean;
  reason?: string;
  notes?: string;
}

export type BusinessSubscriptionBillingCycle =
  | "MONTHLY"
  | "YEARLY"
  | "ONE_TIME"
  | "CUSTOM";

export type BusinessSubscriptionPaymentType =
  | "SUBSCRIPTION"
  | "SETUP_FEE"
  | "TRIAL_CONVERSION"
  | "UPGRADE_PRORATION"
  | "REFUND"
  | "CREDIT"
  | "ADJUSTMENT"
  | "MANUAL_PAYMENT";

export type BusinessSubscriptionPaymentDirection = "INCOMING" | "OUTGOING";

export type BusinessSubscriptionPaymentSource =
  | "ADMIN"
  | "SYSTEM"
  | "PUBLIC_SIGNUP"
  | "WEBHOOK"
  | "IMPORT";

export interface RecordPaymentInput {
  amount: number;
  currency: string;
  paymentMethod: SubscriptionPaymentMethod;
  paymentType?: BusinessSubscriptionPaymentType;
  billingCycle?: BusinessSubscriptionBillingCycle;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  paidAt?: string;
  paymentReference?: string;
  notes?: string;
  activateSubscription?: boolean;
  source?: BusinessSubscriptionPaymentSource;
}

export interface ChangePackageActionInput {
  planGroupId: string;
  planTierId: string;
  billingCycle?: BusinessSubscriptionBillingCycle;
  amount?: number;
  currency?: string;
  customPrice?: boolean;
  keepCurrentPrice?: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  syncCapabilities?: boolean;
  paymentOption?: ChangePackagePaymentOption;
  payment?: RecordPaymentInput;
  reason?: string;
  notes?: string;
}

export interface ChangeSnapshotActionInput {
  snapshotId: string;
  applySnapshot?: boolean;
  reason?: string;
  notes?: string;
}

export type ReactivateBusinessMode =
  | "business_only"
  | "restore_paid"
  | "restore_trial"
  | "restore_internal";

export interface ReactivateBusinessInput {
  mode?: ReactivateBusinessMode;
  currentPeriodEnd?: string;
  payment?: RecordPaymentInput;
  reason?: string;
  notes?: string;
}

export interface ManualAccessUpdateInput {
  businessStatus?: BusinessAccessStatus;
  snapshotId?: string;
  planGroupId?: string | null;
  planTierId?: string | null;
  subscriptionStatus?: SubscriptionAccessStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentStatus?: SubscriptionPaymentStatus;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  syncCapabilitiesFromTier?: boolean;
  applySnapshot?: boolean;
  reason: string;
  adminNotes: string;
}

export interface VoidPaymentInput {
  reason: string;
}

export interface RefundPaymentInput {
  amount: number;
  currency?: string;
  paymentType?: "REFUND" | "CREDIT";
  notes?: string;
  paymentReference?: string;
}

export type BusinessSubscriptionEventType =
  | "CREATED"
  | "STATUS_CHANGED"
  | "PLAN_CHANGED"
  | "UPGRADED"
  | "DOWNGRADED"
  | "TRIAL_STARTED"
  | "TRIAL_EXTENDED"
  | "TRIAL_EXPIRED"
  | "PAYMENT_MARKED_PAID"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "PARTIAL_PAYMENT_RECORDED"
  | "CANCELED"
  | "EXPIRED"
  | "REACTIVATED"
  | "SUSPENDED"
  | "BUSINESS_STATUS_CHANGED"
  | "CAPABILITIES_SYNCED"
  | "SNAPSHOT_CHANGED"
  | "MANUAL_ADJUSTMENT";

export type BusinessSubscriptionEventSource =
  | "ADMIN"
  | "SYSTEM"
  | "PUBLIC_SIGNUP"
  | "WEBHOOK"
  | "IMPORT";

export type BusinessSubscriptionEventSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface BusinessSubscriptionEventListItem {
  id: string;
  subscriptionId?: string | null;
  eventType: BusinessSubscriptionEventType;
  title: string;
  source: BusinessSubscriptionEventSource;
  severity: BusinessSubscriptionEventSeverity;
  actionKey?: string | null;
  paymentId?: string | null;
  createdByNameSnapshot?: string | null;
  notes?: string | null;
  planTierLabel?: string | null;
  statusTransition?: string | null;
  paymentSnippet?: string | null;
  createdAt: string;
}

export interface BusinessSubscriptionEventDetail {
  id: string;
  businessId: string;
  subscriptionId?: string | null;
  eventType: BusinessSubscriptionEventType;
  title: string;
  description?: string | null;
  fromState?: SubscriptionStateSnapshot | null;
  toState?: SubscriptionStateSnapshot | null;
  source: BusinessSubscriptionEventSource;
  severity: BusinessSubscriptionEventSeverity;
  correlationId: string;
  actionKey?: string | null;
  paymentId?: string | null;
  reason?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdById?: string | null;
  createdByNameSnapshot?: string | null;
  createdAt: string;
}

/** @deprecated Use BusinessSubscriptionEventListItem or BusinessSubscriptionEventDetail */
export type BusinessSubscriptionEvent = BusinessSubscriptionEventDetail;

export interface BusinessSubscriptionPayment {
  id: string;
  businessId: string;
  subscriptionId?: string | null;
  amount: string;
  currency: string;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  paymentType: BusinessSubscriptionPaymentType;
  billingCycle: BusinessSubscriptionBillingCycle;
  direction: BusinessSubscriptionPaymentDirection;
  source: BusinessSubscriptionPaymentSource;
  periodStart?: string | null;
  periodEnd?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  recordedAt: string;
  voidedAt?: string | null;
  voidReason?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  externalProvider?: string | null;
  externalPaymentId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListSubscriptionEventsQuery {
  eventType?: BusinessSubscriptionEventType;
  eventTypes?: string;
  source?: BusinessSubscriptionEventSource;
  severity?: BusinessSubscriptionEventSeverity;
  subscriptionStatus?: SubscriptionAccessStatus;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface ListSubscriptionPaymentsQuery {
  paymentStatus?: SubscriptionPaymentStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentType?: BusinessSubscriptionPaymentType;
  paymentDirection?: BusinessSubscriptionPaymentDirection;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
  includeVoided?: boolean;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor?: string | null;
  hasMore?: boolean;
}
