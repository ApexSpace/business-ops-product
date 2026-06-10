import type {
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";
import type {
  BusinessSubscriptionEventDetail,
  BusinessSubscriptionEventListItem,
  BusinessSubscriptionEventSeverity,
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  BusinessSubscriptionPaymentDirection,
  BusinessSubscriptionPaymentSource,
  BusinessSubscriptionPaymentType,
} from "@/features/platform/types/business-subscription";
import type {
  BusinessAccessReasonCode,
  NeedsAttentionFlag,
} from "@/features/platform/utils/business-access-resolver.util";

export const SUBSCRIPTION_HISTORY_EVENT_TYPES: BusinessSubscriptionEventType[] =
  [
    "CREATED",
    "STATUS_CHANGED",
    "PLAN_CHANGED",
    "UPGRADED",
    "DOWNGRADED",
    "TRIAL_STARTED",
    "TRIAL_EXTENDED",
    "TRIAL_EXPIRED",
    "CANCELED",
    "EXPIRED",
    "REACTIVATED",
    "SUSPENDED",
    "BUSINESS_STATUS_CHANGED",
    "CAPABILITIES_SYNCED",
    "SNAPSHOT_CHANGED",
    "MANUAL_ADJUSTMENT",
  ];

export function formatBusinessStatus(status: BusinessAccessStatus): string {
  const labels: Record<BusinessAccessStatus, string> = {
    ACTIVE: "Active",
    NOT_ACTIVE: "Not Active",
    SUSPENDED: "Suspended",
    ARCHIVED: "Archived",
  };
  return labels[status] ?? status;
}

export function formatSubscriptionStatus(
  status: SubscriptionAccessStatus,
): string {
  const labels: Record<SubscriptionAccessStatus, string> = {
    TRIALING: "Trialing",
    ACTIVE: "Active",
    PENDING_PAYMENT: "Pending Payment",
    CANCELED: "Canceled",
    EXPIRED: "Expired",
    INTERNAL: "Free/Internal",
    PAST_DUE: "Past Due",
  };
  return labels[status] ?? status;
}

export function formatPaymentMethod(
  method: SubscriptionPaymentMethod,
): string {
  const labels: Record<SubscriptionPaymentMethod, string> = {
    STRIPE: "Stripe",
    BANK_TRANSFER: "Bank Transfer",
    WISE: "Wise",
    PAYPAL: "PayPal",
    CASH: "Cash",
    JAZZCASH: "JazzCash",
    EASYPAISA: "EasyPaisa",
    MANUAL_INVOICE: "Manual Invoice",
    FREE_INTERNAL: "Free/Internal",
    NOT_SELECTED: "Not Selected",
  };
  return labels[method] ?? method;
}

export function formatPaymentStatus(
  status: SubscriptionPaymentStatus,
): string {
  const labels: Record<SubscriptionPaymentStatus, string> = {
    NOT_REQUIRED: "Not Required",
    PENDING: "Pending",
    PAID: "Paid",
    FAILED: "Failed",
    REFUNDED: "Refunded",
    PARTIALLY_PAID: "Partially Paid",
    OVERDUE: "Overdue",
  };
  return labels[status] ?? status;
}

export function formatNeedsAttentionFlag(flag: NeedsAttentionFlag): string {
  const labels: Record<NeedsAttentionFlag, string> = {
    TRIAL_EXPIRED: "Trial expired",
    PENDING_PAYMENT: "Pending payment",
    ACTIVE_WITH_EXPIRED_SUBSCRIPTION: "Active with expired subscription",
    ACTIVE_WITH_CANCELED_SUBSCRIPTION: "Active with canceled subscription",
    NO_PLAN_TIER: "No plan tier",
    NO_CAPABILITIES: "No capabilities",
    SNAPSHOT_NOT_APPLIED: "Snapshot not applied",
    OWNER_INVITED_WHILE_INACTIVE: "Owner invited while inactive",
  };
  return labels[flag] ?? flag;
}

export function formatSubscriptionEventType(
  type: BusinessSubscriptionEventType,
): string {
  const labels: Record<BusinessSubscriptionEventType, string> = {
    CREATED: "Created",
    STATUS_CHANGED: "Status changed",
    PLAN_CHANGED: "Plan changed",
    UPGRADED: "Upgraded",
    DOWNGRADED: "Downgraded",
    TRIAL_STARTED: "Trial started",
    TRIAL_EXTENDED: "Trial extended",
    TRIAL_EXPIRED: "Trial expired",
    PAYMENT_MARKED_PAID: "Payment marked paid",
    PAYMENT_PENDING: "Payment pending",
    PAYMENT_FAILED: "Payment failed",
    PAYMENT_REFUNDED: "Payment refunded",
    PARTIAL_PAYMENT_RECORDED: "Partial payment",
    CANCELED: "Canceled",
    EXPIRED: "Expired",
    REACTIVATED: "Reactivated",
    SUSPENDED: "Suspended",
    BUSINESS_STATUS_CHANGED: "Business status changed",
    CAPABILITIES_SYNCED: "Capabilities synced",
    SNAPSHOT_CHANGED: "Snapshot changed",
    MANUAL_ADJUSTMENT: "Manual adjustment",
  };
  return labels[type] ?? type;
}

export function formatSubscriptionEventSource(
  source: BusinessSubscriptionEventSource,
): string {
  const labels: Record<BusinessSubscriptionEventSource, string> = {
    ADMIN: "Admin",
    SYSTEM: "System",
    PUBLIC_SIGNUP: "Public signup",
    WEBHOOK: "Webhook",
    IMPORT: "Import",
  };
  return labels[source] ?? source;
}

export function formatSubscriptionEventSeverity(
  severity: BusinessSubscriptionEventSeverity,
): string {
  const labels: Record<BusinessSubscriptionEventSeverity, string> = {
    INFO: "Info",
    WARNING: "Warning",
    CRITICAL: "Critical",
  };
  return labels[severity] ?? severity;
}

export function formatSubscriptionPaymentType(
  type: BusinessSubscriptionPaymentType,
): string {
  const labels: Record<BusinessSubscriptionPaymentType, string> = {
    SUBSCRIPTION: "Subscription",
    SETUP_FEE: "Setup fee",
    TRIAL_CONVERSION: "Trial conversion",
    UPGRADE_PRORATION: "Upgrade proration",
    REFUND: "Refund",
    CREDIT: "Credit",
    ADJUSTMENT: "Adjustment",
    MANUAL_PAYMENT: "Manual payment",
  };
  return labels[type] ?? type;
}

export function formatPaymentDirection(
  direction: BusinessSubscriptionPaymentDirection,
): string {
  return direction === "OUTGOING" ? "Outgoing" : "Incoming";
}

export function formatPaymentSource(
  source: BusinessSubscriptionPaymentSource,
): string {
  const labels: Record<BusinessSubscriptionPaymentSource, string> = {
    ADMIN: "Admin",
    SYSTEM: "System",
    PUBLIC_SIGNUP: "Public signup",
    WEBHOOK: "Webhook",
    IMPORT: "Import",
  };
  return labels[source] ?? source;
}

const PAYMENT_RELATED_SUBSCRIPTION_EVENT_TYPES: BusinessSubscriptionEventType[] =
  [
    "PAYMENT_MARKED_PAID",
    "PAYMENT_PENDING",
    "PAYMENT_FAILED",
    "PAYMENT_REFUNDED",
    "PARTIAL_PAYMENT_RECORDED",
  ];

export function formatPlanTierTransition(
  fromName?: string | null,
  toName?: string | null,
): string {
  const from = fromName?.trim() || null;
  const to = toName?.trim() || null;
  if (!from && !to) return "—";
  if (!from || from === to) return to ?? from ?? "—";
  if (!to) return from;
  return `${from} → ${to}`;
}

export function formatSubscriptionStatusTransition(
  from?: SubscriptionAccessStatus | null,
  to?: SubscriptionAccessStatus | null,
): string {
  const fromLabel = from ? formatSubscriptionStatus(from) : null;
  const toLabel = to ? formatSubscriptionStatus(to) : null;
  if (!fromLabel && !toLabel) return "—";
  if (!fromLabel || fromLabel === toLabel) return toLabel ?? fromLabel ?? "—";
  if (!toLabel) return fromLabel;
  return `${fromLabel} → ${toLabel}`;
}

export function formatSubscriptionEventLabel(
  event: Pick<BusinessSubscriptionEventListItem, "eventType" | "title">,
): string {
  return `${formatSubscriptionEventType(event.eventType)} — ${event.title}`;
}

export function formatSubscriptionEventPaymentSnippet(
  event: Pick<
    BusinessSubscriptionEventListItem,
    "eventType" | "paymentId" | "paymentSnippet"
  > & {
    fromState?: BusinessSubscriptionEventDetail["fromState"];
    toState?: BusinessSubscriptionEventDetail["toState"];
  },
): string | null {
  if (event.paymentSnippet) return event.paymentSnippet;

  const isPaymentRelated =
    event.paymentId != null ||
    PAYMENT_RELATED_SUBSCRIPTION_EVENT_TYPES.includes(event.eventType);
  if (!isPaymentRelated) return null;

  const state = event.toState ?? event.fromState;
  const parts: string[] = [];
  if (state?.paymentStatus) {
    parts.push(formatPaymentStatus(state.paymentStatus));
  }
  if (state?.amount) {
    parts.push(
      state.currency ? `${state.amount} ${state.currency}` : state.amount,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "Linked";
}

export function formatAccessImpact(
  fromCanAccess?: boolean,
  toCanAccess?: boolean,
): string {
  if (fromCanAccess === undefined && toCanAccess === undefined) return "—";
  const from = fromCanAccess ? "Can access" : "Cannot access";
  const to = toCanAccess ? "Can access" : "Cannot access";
  return `${from} → ${to}`;
}

export function formatAccessReasonCode(code: BusinessAccessReasonCode): string {
  const labels: Record<BusinessAccessReasonCode, string> = {
    ACCESS_GRANTED: "Can access",
    BUSINESS_SUSPENDED: "Suspended",
    BUSINESS_NOT_ACTIVE: "Not active",
    NO_SUBSCRIPTION: "No subscription",
    SUBSCRIPTION_ACTIVE: "Active subscription",
    SUBSCRIPTION_TRIALING: "Trialing",
    TRIAL_EXPIRED: "Trial expired",
    SUBSCRIPTION_INTERNAL: "Internal access",
    SUBSCRIPTION_PENDING_PAYMENT: "Pending payment",
    SUBSCRIPTION_EXPIRED: "Expired",
    SUBSCRIPTION_CANCELED: "Canceled",
    SUBSCRIPTION_PAST_DUE: "Past due",
    SUBSCRIPTION_UNKNOWN: "Cannot access",
  };
  return labels[code] ?? code;
}
