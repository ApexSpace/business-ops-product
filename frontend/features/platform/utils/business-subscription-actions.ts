import type { Business } from "@/features/platform/types";
import type {
  SubscriptionActionDefinition,
  SubscriptionActionKey,
} from "@/features/platform/types/business-subscription";

const LIST_EXECUTABLE_ACTIONS: SubscriptionActionKey[] = [
  "MARK_PAID",
  "MOVE_PENDING",
  "EXTEND_TRIAL",
  "EXPIRE_TRIAL",
  "SUSPEND_BUSINESS",
  "REACTIVATE_BUSINESS",
  "CANCEL_SUBSCRIPTION",
];

export const ACTIONS_REQUIRING_ACCESS_TAB: SubscriptionActionKey[] = [
  "MARK_PAID",
  "RECORD_PAYMENT",
  "EXTEND_TRIAL",
  "CHANGE_PACKAGE",
  "CHANGE_SNAPSHOT",
  "MANUAL_ADJUSTMENT",
];

type ListActionBusiness = Pick<
  Business,
  | "status"
  | "subscriptionStatus"
  | "paymentStatus"
  | "planTierId"
  | "canAccessWorkspace"
  | "currentPeriodEnd"
  | "recommendedActionKey"
  | "recommendedAction"
>;

function getRecommendedActionKey(
  business: ListActionBusiness,
): SubscriptionActionKey | null {
  const key = business.recommendedActionKey ?? business.recommendedAction;
  return key ? (key as SubscriptionActionKey) : null;
}

/**
 * Mirrors backend action availability for list-row quick actions.
 * Prefer `recommendedActionKey` from the businesses list API.
 */
export function deriveListRowActions(business: ListActionBusiness): {
  recommendedAction: SubscriptionActionKey | null;
  moreActions: SubscriptionActionKey[];
} {
  const candidates = buildListActionCandidates(business);
  const backendRecommended = getRecommendedActionKey(business);

  const recommended =
    backendRecommended && candidates.includes(backendRecommended)
      ? backendRecommended
      : pickRecommendedFromState(business, candidates);

  return {
    recommendedAction: recommended,
    moreActions: candidates.filter((action) => action !== recommended),
  };
}

/** @deprecated Use deriveListRowActions */
export const mirrorListRowActions = deriveListRowActions;

function buildListActionCandidates(
  business: ListActionBusiness,
): SubscriptionActionKey[] {
  const subStatus = business.subscriptionStatus;
  const paymentStatus = business.paymentStatus;
  const businessStatus = business.status;
  const canAccess = business.canAccessWorkspace ?? false;

  const isSuspended = businessStatus === "SUSPENDED";
  const isActiveBusiness = businessStatus === "ACTIVE";
  const isCanceled = subStatus === "CANCELED";
  const isExpired = subStatus === "EXPIRED";
  const isPending =
    subStatus === "PENDING_PAYMENT" || paymentStatus === "PENDING";
  const isTrialing = subStatus === "TRIALING";
  const isInternal = subStatus === "INTERNAL";
  const isTerminal = isCanceled || isExpired;

  const definitions: Array<{
    key: SubscriptionActionKey;
    visible: boolean;
    enabled: boolean;
  }> = [
    {
      key: "MARK_PAID",
      visible: isPending || isTrialing,
      enabled: isPending || (isTrialing && !isSuspended),
    },
    {
      key: "MOVE_PENDING",
      visible: !isPending && !isSuspended && !isTerminal,
      enabled: !isPending && isActiveBusiness && !isInternal,
    },
    {
      key: "EXTEND_TRIAL",
      visible: isTrialing || isExpired,
      enabled: (isTrialing || isExpired) && !isSuspended,
    },
    {
      key: "CANCEL_SUBSCRIPTION",
      visible: !isCanceled,
      enabled: Boolean(subStatus) && !isCanceled && !isSuspended,
    },
    {
      key: "EXPIRE_TRIAL",
      visible: isTrialing && !isExpired,
      enabled: isTrialing && !isSuspended,
    },
    {
      key: "SUSPEND_BUSINESS",
      visible: !isSuspended,
      enabled: !isSuspended,
    },
    {
      key: "REACTIVATE_BUSINESS",
      visible: isSuspended || isTerminal || !canAccess,
      enabled: isSuspended || isTerminal || !canAccess,
    },
  ];

  return definitions
    .filter((action) => action.visible && action.enabled)
    .map((action) => action.key)
    .filter((key) => LIST_EXECUTABLE_ACTIONS.includes(key));
}

function pickRecommendedFromState(
  business: ListActionBusiness,
  candidates: SubscriptionActionKey[],
): SubscriptionActionKey | null {
  const subStatus = business.subscriptionStatus;
  const paymentStatus = business.paymentStatus;
  const businessStatus = business.status;

  if (
    subStatus === "PENDING_PAYMENT" ||
    paymentStatus === "PENDING"
  ) {
    if (candidates.includes("MARK_PAID")) return "MARK_PAID";
  }

  if (businessStatus === "SUSPENDED") {
    if (candidates.includes("REACTIVATE_BUSINESS")) return "REACTIVATE_BUSINESS";
  }

  if (subStatus === "CANCELED" || subStatus === "EXPIRED") {
    if (candidates.includes("REACTIVATE_BUSINESS")) return "REACTIVATE_BUSINESS";
  }

  if (subStatus === "TRIALING" && business.currentPeriodEnd) {
    const periodEnd = new Date(business.currentPeriodEnd);
    if (periodEnd < new Date()) {
      if (candidates.includes("EXTEND_TRIAL")) return "EXTEND_TRIAL";
      if (candidates.includes("MARK_PAID")) return "MARK_PAID";
    }
  }

  const prefer: SubscriptionActionKey[] = [
    "MARK_PAID",
    "REACTIVATE_BUSINESS",
    "EXTEND_TRIAL",
    "MOVE_PENDING",
    "SUSPEND_BUSINESS",
  ];
  for (const key of prefer) {
    if (candidates.includes(key)) return key;
  }

  return candidates[0] ?? null;
}

export function findActionDefinition(
  actions: SubscriptionActionDefinition[] | undefined,
  key: SubscriptionActionKey,
): SubscriptionActionDefinition | undefined {
  return actions?.find((a) => a.key === key && a.visible);
}

export function groupActionsByCategory(
  actions: SubscriptionActionDefinition[],
  excludeKey?: SubscriptionActionKey | null,
): Record<string, SubscriptionActionDefinition[]> {
  const visible = actions.filter(
    (action) =>
      action.visible &&
      action.key !== excludeKey &&
      action.category !== "recommended",
  );
  const groups: Record<string, SubscriptionActionDefinition[]> = {
    billing: [],
    trial: [],
    access: [],
    package: [],
    snapshot: [],
    danger: [],
  };
  for (const action of visible) {
    const bucket = groups[action.category];
    if (bucket) bucket.push(action);
  }
  return groups;
}

export const ACTION_KEY_LABELS: Record<SubscriptionActionKey, string> = {
  MARK_PAID: "Mark Paid",
  RECORD_PAYMENT: "Record Payment",
  MOVE_PENDING: "Move to Pending Payment",
  EXTEND_TRIAL: "Extend Trial",
  CANCEL_SUBSCRIPTION: "Cancel Subscription",
  EXPIRE_TRIAL: "Expire Trial",
  SUSPEND_BUSINESS: "Suspend Business",
  REACTIVATE_BUSINESS: "Reactivate Business",
  CHANGE_PACKAGE: "Change Package",
  CHANGE_SNAPSHOT: "Change Snapshot",
  SYNC_CAPABILITIES: "Sync Capabilities",
  MANUAL_ADJUSTMENT: "Manual Adjustment",
};
