import type {
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";

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

export interface BusinessAccessResolverInput {
  businessStatus: BusinessAccessStatus;
  snapshotId?: string | null;
  snapshotAppliedAt?: string | null;
  snapshotUpdatedAt?: string | null;
  subscription?: {
    status: SubscriptionAccessStatus;
    planTierId?: string | null;
    paymentStatus: SubscriptionPaymentStatus;
    currentPeriodEnd?: string | null;
  } | null;
  capabilities: EffectiveCapability[];
  hasPendingOwnerInvite?: boolean;
}

const REASON_LABELS: Record<BusinessAccessReasonCode, string> = {
  ACCESS_GRANTED: "Workspace access is granted.",
  BUSINESS_SUSPENDED: "Workspace is suspended.",
  BUSINESS_NOT_ACTIVE: "Workspace is not active yet.",
  NO_SUBSCRIPTION: "No subscription is configured.",
  SUBSCRIPTION_ACTIVE: "Active subscription.",
  SUBSCRIPTION_TRIALING: "Trial is active.",
  TRIAL_EXPIRED: "Trial has expired.",
  SUBSCRIPTION_INTERNAL: "Internal workspace access.",
  SUBSCRIPTION_PENDING_PAYMENT: "Payment is pending.",
  SUBSCRIPTION_EXPIRED: "Subscription has expired.",
  SUBSCRIPTION_CANCELED: "Subscription is canceled.",
  SUBSCRIPTION_PAST_DUE: "Subscription payment is past due.",
  SUBSCRIPTION_UNKNOWN: "Subscription does not allow access.",
};

const NEEDS_ATTENTION_LABELS: Record<NeedsAttentionFlag, string> = {
  TRIAL_EXPIRED: "Trial expired",
  PENDING_PAYMENT: "Pending payment",
  ACTIVE_WITH_EXPIRED_SUBSCRIPTION: "Active business with expired subscription",
  ACTIVE_WITH_CANCELED_SUBSCRIPTION: "Active business with canceled subscription",
  NO_PLAN_TIER: "No plan tier assigned",
  NO_CAPABILITIES: "No capabilities assigned",
  SNAPSHOT_NOT_APPLIED: "Snapshot not applied",
  OWNER_INVITED_WHILE_INACTIVE: "Owner invited while workspace inactive",
};

function isSnapshotNotApplied(input: BusinessAccessResolverInput): boolean {
  if (!input.snapshotId) return false;
  if (!input.snapshotAppliedAt) return true;
  if (
    input.snapshotUpdatedAt &&
    new Date(input.snapshotAppliedAt) < new Date(input.snapshotUpdatedAt)
  ) {
    return true;
  }
  return false;
}

/**
 * Access resolution rules (mirrors backend BusinessAccessResolverService):
 * - Access gate: businessStatus === ACTIVE AND subscription.status in allowed set.
 * - paymentStatus is informational / needsAttention only (except PENDING_PAYMENT subscription).
 * - ARCHIVED business + PAST_DUE subscription: legacy values, treated as blocked.
 * - TRIALING: access while currentPeriodEnd >= now.
 */
function resolveAccess(
  businessStatus: BusinessAccessStatus,
  sub: BusinessAccessResolverInput["subscription"],
  now: Date,
): { canAccessWorkspace: boolean; reasonCode: BusinessAccessReasonCode } {
  if (businessStatus === "SUSPENDED") {
    return { canAccessWorkspace: false, reasonCode: "BUSINESS_SUSPENDED" };
  }
  if (businessStatus === "NOT_ACTIVE" || businessStatus === "ARCHIVED") {
    return { canAccessWorkspace: false, reasonCode: "BUSINESS_NOT_ACTIVE" };
  }
  if (!sub) {
    return { canAccessWorkspace: false, reasonCode: "NO_SUBSCRIPTION" };
  }

  switch (sub.status) {
    case "ACTIVE":
      return { canAccessWorkspace: true, reasonCode: "SUBSCRIPTION_ACTIVE" };
    case "TRIALING": {
      if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) >= now) {
        return { canAccessWorkspace: true, reasonCode: "SUBSCRIPTION_TRIALING" };
      }
      return { canAccessWorkspace: false, reasonCode: "TRIAL_EXPIRED" };
    }
    case "INTERNAL":
      return { canAccessWorkspace: true, reasonCode: "SUBSCRIPTION_INTERNAL" };
    case "PENDING_PAYMENT":
      return {
        canAccessWorkspace: false,
        reasonCode: "SUBSCRIPTION_PENDING_PAYMENT",
      };
    case "EXPIRED":
      return { canAccessWorkspace: false, reasonCode: "SUBSCRIPTION_EXPIRED" };
    case "CANCELED":
      return { canAccessWorkspace: false, reasonCode: "SUBSCRIPTION_CANCELED" };
    case "PAST_DUE":
      return { canAccessWorkspace: false, reasonCode: "SUBSCRIPTION_PAST_DUE" };
    default:
      return { canAccessWorkspace: false, reasonCode: "SUBSCRIPTION_UNKNOWN" };
  }
}

export function resolveBusinessAccess(
  input: BusinessAccessResolverInput,
): BusinessAccessResolution {
  const now = new Date();
  const needsAttention: NeedsAttentionFlag[] = [];
  const effectiveCapabilities = input.capabilities.filter(Boolean);
  const sub = input.subscription;

  if (sub?.status === "TRIALING" && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < now) {
    needsAttention.push("TRIAL_EXPIRED");
  }
  if (sub?.status === "PENDING_PAYMENT" || sub?.paymentStatus === "PENDING") {
    needsAttention.push("PENDING_PAYMENT");
  }
  if (input.businessStatus === "ACTIVE" && sub?.status === "EXPIRED") {
    needsAttention.push("ACTIVE_WITH_EXPIRED_SUBSCRIPTION");
  }
  if (input.businessStatus === "ACTIVE" && sub?.status === "CANCELED") {
    needsAttention.push("ACTIVE_WITH_CANCELED_SUBSCRIPTION");
  }
  if (!sub?.planTierId && sub?.status !== "INTERNAL") {
    needsAttention.push("NO_PLAN_TIER");
  }
  if (effectiveCapabilities.length === 0) {
    needsAttention.push("NO_CAPABILITIES");
  }
  if (isSnapshotNotApplied(input)) {
    needsAttention.push("SNAPSHOT_NOT_APPLIED");
  }
  if (input.hasPendingOwnerInvite && input.businessStatus !== "ACTIVE") {
    needsAttention.push("OWNER_INVITED_WHILE_INACTIVE");
  }

  const { canAccessWorkspace, reasonCode } = resolveAccess(
    input.businessStatus,
    sub,
    now,
  );

  return {
    canAccessWorkspace,
    reasonCode,
    reasonLabel: REASON_LABELS[reasonCode],
    warnings: needsAttention.map((flag) => NEEDS_ATTENTION_LABELS[flag]),
    needsAttention,
    effectiveCapabilities,
  };
}

export function computeCapabilityDiff(
  current: EffectiveCapability[],
  next: EffectiveCapability[],
  preservedKeys: string[] = [],
): {
  toAdd: EffectiveCapability[];
  toRemove: EffectiveCapability[];
} {
  const currentKeys = new Set(current.map((c) => c.key));
  const nextKeys = new Set(next.map((c) => c.key));
  const preserved = new Set(preservedKeys);

  const toAdd = next.filter((c) => !currentKeys.has(c.key));
  const toRemove = current.filter(
    (c) => !nextKeys.has(c.key) && !preserved.has(c.key),
  );

  return { toAdd, toRemove };
}
