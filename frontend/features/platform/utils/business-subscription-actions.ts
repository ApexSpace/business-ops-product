import type { Business } from "@/features/platform/types";
import type {
  BusinessAccessStatus,
  BusinessAccess,
  SubscriptionAccessStatus,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";
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

export type SubscriptionActionGroupId =
  | "plan"
  | "payment"
  | "trial"
  | "access"
  | "experience"
  | "danger"
  | "advanced";

export const SUBSCRIPTION_TAB_GROUP_ORDER: SubscriptionActionGroupId[] = [
  "plan",
  "payment",
  "trial",
  "access",
  "experience",
  "danger",
  "advanced",
];

export const SUBSCRIPTION_TAB_GROUP_LABELS: Record<
  SubscriptionActionGroupId,
  string
> = {
  plan: "Plan",
  payment: "Payment",
  trial: "Trial",
  access: "Access",
  experience: "Experience",
  danger: "Danger Zone",
  advanced: "Advanced",
};

const ACTION_TO_TAB_GROUP: Record<
  SubscriptionActionKey,
  SubscriptionActionGroupId
> = {
  CHANGE_PACKAGE: "plan",
  MARK_PAID: "payment",
  RECORD_PAYMENT: "payment",
  MOVE_PENDING: "payment",
  EXTEND_TRIAL: "trial",
  EXPIRE_TRIAL: "trial",
  SUSPEND_BUSINESS: "access",
  REACTIVATE_BUSINESS: "access",
  CHANGE_SNAPSHOT: "experience",
  SYNC_CAPABILITIES: "experience",
  CANCEL_SUBSCRIPTION: "danger",
  MANUAL_ADJUSTMENT: "advanced",
};

export const ACCESS_TAB_CATEGORY_LABELS: Record<string, string> = {
  billing: "Payment",
  trial: "Trial",
  access: "Access",
  package: "Plan",
  snapshot: "Experience",
  danger: "Danger Zone",
};

export interface SubscriptionActionLabelContext {
  subscriptionStatus?: SubscriptionAccessStatus | null;
  paymentStatus?: SubscriptionPaymentStatus | null;
  businessStatus?: BusinessAccessStatus | null;
  hasPlanTier?: boolean;
  isTrialEndingSoon?: boolean;
  planPriceComparison?: "upgrade" | "downgrade" | "same" | null;
}

export const ACTION_KEY_LABELS: Record<SubscriptionActionKey, string> = {
  MARK_PAID: "Collect Payment",
  RECORD_PAYMENT: "Collect Payment",
  MOVE_PENDING: "Mark as Awaiting Payment",
  EXTEND_TRIAL: "Extend Trial",
  CANCEL_SUBSCRIPTION: "Cancel Subscription",
  EXPIRE_TRIAL: "End Trial",
  SUSPEND_BUSINESS: "Pause Access",
  REACTIVATE_BUSINESS: "Restore Access",
  CHANGE_PACKAGE: "Change Plan",
  CHANGE_SNAPSHOT: "Change Business Experience",
  SYNC_CAPABILITIES: "Refresh Included Features",
  MANUAL_ADJUSTMENT: "Advanced Adjustment",
};

const PAYMENT_ACTION_KEYS = new Set<SubscriptionActionKey>([
  "MARK_PAID",
  "RECORD_PAYMENT",
  "MOVE_PENDING",
]);

const TRIAL_ACTION_KEYS = new Set<SubscriptionActionKey>([
  "EXTEND_TRIAL",
  "EXPIRE_TRIAL",
]);

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

export function buildActionLabelContext(
  access: BusinessAccess,
): SubscriptionActionLabelContext {
  const sub = access.subscription;
  return {
    subscriptionStatus: sub?.status ?? null,
    paymentStatus: sub?.paymentStatus ?? null,
    businessStatus: access.businessStatus,
    hasPlanTier: Boolean(sub?.planTierId),
    isTrialEndingSoon: isTrialEndingSoon(access),
  };
}

export function buildActionLabelContextFromBusiness(
  business: ListActionBusiness,
): SubscriptionActionLabelContext {
  return {
    subscriptionStatus: business.subscriptionStatus ?? null,
    paymentStatus:
      (business.paymentStatus as SubscriptionPaymentStatus | null) ?? null,
    businessStatus: business.status,
    hasPlanTier: Boolean(business.planTierId),
    isTrialEndingSoon: isTrialEndingSoonFromValues(
      business.subscriptionStatus,
      business.currentPeriodEnd,
    ),
  };
}

export function isTrialEndingSoon(access: BusinessAccess): boolean {
  return isTrialEndingSoonFromValues(
    access.subscription?.status,
    access.subscription?.currentPeriodEnd,
  );
}

function isTrialEndingSoonFromValues(
  subscriptionStatus?: SubscriptionAccessStatus | null,
  currentPeriodEnd?: string | null,
): boolean {
  if (subscriptionStatus !== "TRIALING" || !currentPeriodEnd) return false;
  const endDate = new Date(currentPeriodEnd);
  const now = new Date();
  const msLeft = endDate.getTime() - now.getTime();
  const daysLeft = msLeft / (1000 * 60 * 60 * 24);
  return daysLeft <= 7;
}

export function getSubscriptionActionLabel(
  key: SubscriptionActionKey,
  context: SubscriptionActionLabelContext = {},
): string {
  if (key === "CHANGE_PACKAGE") {
    if (!context.hasPlanTier) return "Assign Plan";
    if (context.subscriptionStatus === "TRIALING") return "Change Plan";
    if (context.businessStatus === "SUSPENDED") return "Review Subscription";
    if (
      context.planPriceComparison === "upgrade"
    ) {
      return "Upgrade Plan";
    }
    if (context.planPriceComparison === "downgrade") {
      return "Downgrade Plan";
    }
    return ACTION_KEY_LABELS.CHANGE_PACKAGE;
  }

  if (key === "MARK_PAID") {
    if (context.subscriptionStatus === "TRIALING") return "Convert to Paid";
    return ACTION_KEY_LABELS.MARK_PAID;
  }

  if (key === "RECORD_PAYMENT") {
    if (
      context.subscriptionStatus === "ACTIVE" &&
      context.paymentStatus === "PAID"
    ) {
      return "Record Renewal Payment";
    }
    return ACTION_KEY_LABELS.RECORD_PAYMENT;
  }

  if (key === "REACTIVATE_BUSINESS") {
    if (
      context.subscriptionStatus === "CANCELED" ||
      context.subscriptionStatus === "EXPIRED"
    ) {
      return "Reactivate Subscription";
    }
    return ACTION_KEY_LABELS.REACTIVATE_BUSINESS;
  }

  return ACTION_KEY_LABELS[key];
}

export function resolveChangePlanLabel(
  currentAmount: number | null | undefined,
  newAmount: number | null | undefined,
): string {
  if (
    currentAmount == null ||
    newAmount == null ||
    Number.isNaN(currentAmount) ||
    Number.isNaN(newAmount)
  ) {
    return ACTION_KEY_LABELS.CHANGE_PACKAGE;
  }
  if (newAmount > currentAmount) return "Upgrade Plan";
  if (newAmount < currentAmount) return "Downgrade Plan";
  return ACTION_KEY_LABELS.CHANGE_PACKAGE;
}

export function withFriendlyActionLabel(
  action: SubscriptionActionDefinition,
  context: SubscriptionActionLabelContext,
): SubscriptionActionDefinition {
  return {
    ...action,
    label: getSubscriptionActionLabel(action.key, context),
  };
}

export function applyFriendlyActionLabels(
  actions: SubscriptionActionDefinition[],
  context: SubscriptionActionLabelContext,
): SubscriptionActionDefinition[] {
  return actions.map((action) => withFriendlyActionLabel(action, context));
}

export function getActionConfirmationCopy(
  key: SubscriptionActionKey,
  context: SubscriptionActionLabelContext = {},
): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  const label = getSubscriptionActionLabel(key, context);
  const copies: Partial<
    Record<
      SubscriptionActionKey,
      { title: string; description: string; confirmLabel?: string }
    >
  > = {
    CANCEL_SUBSCRIPTION: {
      title: "Cancel subscription?",
      description:
        "This ends the customer's subscription. They may lose access when the current period ends.",
      confirmLabel: "Cancel Subscription",
    },
    EXPIRE_TRIAL: {
      title: "End trial?",
      description:
        "This ends the trial immediately. The customer may lose access unless you collect payment or extend the trial.",
      confirmLabel: "End Trial",
    },
    SUSPEND_BUSINESS: {
      title: "Pause access?",
      description:
        "This temporarily blocks workspace access. Billing and subscription settings stay in place until you restore access.",
      confirmLabel: "Pause Access",
    },
    MOVE_PENDING: {
      title: "Mark as awaiting payment?",
      description:
        "This flags the subscription as waiting for payment. Access may be limited until payment is collected.",
      confirmLabel: "Mark as Awaiting Payment",
    },
    SYNC_CAPABILITIES: {
      title: "Refresh included features?",
      description:
        "This syncs plan features with the current tier. Custom or manual add-ons are preserved.",
      confirmLabel: "Refresh Included Features",
    },
    CHANGE_PACKAGE: {
      title: "Change plan?",
      description:
        "This updates the customer's plan and billing right away. Review the impact preview before confirming.",
      confirmLabel: label,
    },
    CHANGE_SNAPSHOT: {
      title: "Change business experience?",
      description:
        "This may update labels, navigation, and other workspace settings tied to the selected experience.",
      confirmLabel: "Change Business Experience",
    },
    MANUAL_ADJUSTMENT: {
      title: "Apply advanced adjustment?",
      description:
        "This directly changes subscription or access fields. Use only when standard actions are not enough.",
      confirmLabel: "Advanced Adjustment",
    },
    MARK_PAID: {
      title:
        context.subscriptionStatus === "TRIALING"
          ? "Convert to paid?"
          : "Collect payment?",
      description:
        context.subscriptionStatus === "TRIALING"
          ? "This converts the trial to a paid subscription and may create a payment record."
          : "This records payment and may restore or extend access for the customer.",
      confirmLabel:
        context.subscriptionStatus === "TRIALING"
          ? "Convert to Paid"
          : "Collect Payment",
    },
    REACTIVATE_BUSINESS: {
      title:
        context.subscriptionStatus === "CANCELED" ||
        context.subscriptionStatus === "EXPIRED"
          ? "Reactivate subscription?"
          : "Restore access?",
      description:
        context.subscriptionStatus === "CANCELED" ||
        context.subscriptionStatus === "EXPIRED"
          ? "This brings the subscription back and may restore workspace access."
          : "This restores workspace access for the customer.",
      confirmLabel: getSubscriptionActionLabel("REACTIVATE_BUSINESS", context),
    },
  };

  const copy = copies[key];
  if (copy) {
    return {
      title: copy.title,
      description: copy.description,
      confirmLabel: copy.confirmLabel ?? label,
    };
  }

  return {
    title: `Confirm: ${label}`,
    description: "Review the impact below before continuing.",
    confirmLabel: label,
  };
}

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

  if (subStatus === "PENDING_PAYMENT" || paymentStatus === "PENDING") {
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

export function filterActionsForSubscriptionsTab(
  actions: SubscriptionActionDefinition[],
  access: BusinessAccess,
): SubscriptionActionDefinition[] {
  const sub = access.subscription;
  const subStatus = sub?.status;
  const paymentStatus = sub?.paymentStatus;
  const businessStatus = access.businessStatus;
  const hasPlan = Boolean(sub?.planTierId);
  const isInternal = subStatus === "INTERNAL";
  const isTrialing = subStatus === "TRIALING";
  const isPending =
    subStatus === "PENDING_PAYMENT" || paymentStatus === "PENDING";
  const isSuspended = businessStatus === "SUSPENDED";
  const isTerminal = subStatus === "CANCELED" || subStatus === "EXPIRED";
  const isActivePaid =
    subStatus === "ACTIVE" && paymentStatus === "PAID" && !isSuspended;

  return actions.filter((action) => {
    if (!action.visible) return false;

    if (isInternal && PAYMENT_ACTION_KEYS.has(action.key)) return false;

    if (!hasPlan && action.key === "RECORD_PAYMENT") return false;

    if (isTrialing && action.key === "MOVE_PENDING") return false;

    if (isActivePaid && TRIAL_ACTION_KEYS.has(action.key)) return false;

    if (isTerminal && action.key === "SUSPEND_BUSINESS") return false;

    if (isPending && action.key === "EXPIRE_TRIAL") return false;

    if (!isTrialing && action.key === "EXPIRE_TRIAL") return false;

    if (isSuspended && action.key === "SUSPEND_BUSINESS") return false;

    return true;
  });
}

function pickStatePrimarySecondary(
  keys: SubscriptionActionKey[],
  access: BusinessAccess,
): {
  primary: SubscriptionActionKey | null;
  secondary: SubscriptionActionKey | null;
} {
  const keySet = new Set(keys);
  const sub = access.subscription;
  const subStatus = sub?.status;
  const paymentStatus = sub?.paymentStatus;
  const businessStatus = access.businessStatus;
  const hasPlan = Boolean(sub?.planTierId);

  const pick = (
    primary: SubscriptionActionKey | null,
    secondary: SubscriptionActionKey | null,
  ) => ({
    primary: primary && keySet.has(primary) ? primary : null,
    secondary:
      secondary && keySet.has(secondary) && secondary !== primary
        ? secondary
        : null,
  });

  if (!hasPlan) {
    return pick("CHANGE_PACKAGE", null);
  }

  if (subStatus === "INTERNAL") {
    return pick("CHANGE_PACKAGE", null);
  }

  if (subStatus === "TRIALING") {
    return pick("MARK_PAID", "EXTEND_TRIAL");
  }

  if (subStatus === "PENDING_PAYMENT" || paymentStatus === "PENDING") {
    return pick("MARK_PAID", "CHANGE_PACKAGE");
  }

  if (businessStatus === "SUSPENDED") {
    return pick("REACTIVATE_BUSINESS", "CHANGE_PACKAGE");
  }

  if (subStatus === "CANCELED" || subStatus === "EXPIRED") {
    return pick("REACTIVATE_BUSINESS", null);
  }

  if (subStatus === "ACTIVE" && paymentStatus === "PAID") {
    return pick("CHANGE_PACKAGE", "RECORD_PAYMENT");
  }

  if (keySet.has("CHANGE_PACKAGE")) {
    return pick("CHANGE_PACKAGE", keySet.has("MARK_PAID") ? "MARK_PAID" : null);
  }

  return pick(keys[0] ?? null, keys[1] ?? null);
}

export interface SubscriptionTabActionLayout {
  primary: SubscriptionActionDefinition | null;
  secondary: SubscriptionActionDefinition | null;
  moreGroups: Array<{
    id: SubscriptionActionGroupId;
    label: string;
    actions: SubscriptionActionDefinition[];
  }>;
  trialEndingSoon: boolean;
  showManageAccessSecondary: boolean;
}

export function deriveSubscriptionTabActionLayout(
  access: BusinessAccess,
): SubscriptionTabActionLayout {
  const context = buildActionLabelContext(access);
  const rawActions = access.availableActions ?? [];
  const filtered = filterActionsForSubscriptionsTab(rawActions, access);
  const friendly = applyFriendlyActionLabels(
    filtered.filter((a) => a.enabled),
    context,
  );

  const friendlyByKey = new Map(friendly.map((a) => [a.key, a]));
  const availableKeys = friendly.map((a) => a.key);

  const backendRecommended = access.recommendedAction;
  let primaryKey: SubscriptionActionKey | null = null;
  let secondaryKey: SubscriptionActionKey | null = null;

  if (
    backendRecommended?.visible &&
    backendRecommended.enabled &&
    friendlyByKey.has(backendRecommended.key)
  ) {
    primaryKey = backendRecommended.key;
    const statePick = pickStatePrimarySecondary(availableKeys, access);
    secondaryKey =
      statePick.secondary && statePick.secondary !== primaryKey
        ? statePick.secondary
        : null;
  } else {
    const statePick = pickStatePrimarySecondary(availableKeys, access);
    primaryKey = statePick.primary;
    secondaryKey = statePick.secondary;
  }

  const headerKeys = new Set(
    [primaryKey, secondaryKey].filter(Boolean) as SubscriptionActionKey[],
  );

  const moreActions = friendly.filter((a) => !headerKeys.has(a.key));
  const grouped = new Map<SubscriptionActionGroupId, SubscriptionActionDefinition[]>();

  for (const action of moreActions) {
    const groupId = ACTION_TO_TAB_GROUP[action.key];
    const bucket = grouped.get(groupId) ?? [];
    bucket.push(action);
    grouped.set(groupId, bucket);
  }

  const moreGroups = SUBSCRIPTION_TAB_GROUP_ORDER.flatMap((id) => {
    const actions = grouped.get(id);
    if (!actions?.length) return [];
    return [{ id, label: SUBSCRIPTION_TAB_GROUP_LABELS[id], actions }];
  });

  const hasPlan = Boolean(access.subscription?.planTierId);

  return {
    primary: primaryKey ? (friendlyByKey.get(primaryKey) ?? null) : null,
    secondary: secondaryKey ? (friendlyByKey.get(secondaryKey) ?? null) : null,
    moreGroups,
    trialEndingSoon: context.isTrialEndingSoon ?? false,
    showManageAccessSecondary: !hasPlan,
  };
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
