export type TierPosition = "lowest" | "middle" | "highest" | "only" | "unknown";

export type TierRelativePosition = "same" | "higher" | "lower" | "unknown";

export type PlanSelectionMode = "trial" | "paid-stripe" | "default" | "recovery";

export const PREVIOUS_PLAN_HELPER_TEXT =
  "Your previous subscription used this plan.";

export type PlanChangeDirection = "upgrade" | "downgrade" | "both";

export function isCanceledOrExpiredSubscription(
  status?: string | null,
): boolean {
  const normalized = status?.toUpperCase();
  return normalized === "CANCELED" || normalized === "EXPIRED";
}

export function isRecoverySubscriptionStatus(
  status?: string | null,
): boolean {
  const normalized = status?.toUpperCase();
  return (
    normalized === "CANCELED" ||
    normalized === "EXPIRED" ||
    normalized === "PAST_DUE" ||
    normalized === "PENDING_PAYMENT"
  );
}

export function isActivePaidStripeSubscription(
  billingSource?: string | null,
  status?: string | null,
): boolean {
  return (
    billingSource === "STRIPE" && status?.toUpperCase() === "ACTIVE"
  );
}

export function isCancellationScheduled(input: {
  billingSource?: string | null;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
}): boolean {
  return (
    input.billingSource === "STRIPE" &&
    input.subscriptionStatus?.toUpperCase() === "ACTIVE" &&
    input.cancelAtPeriodEnd === true
  );
}

export function isTrialingSubscription(status?: string | null): boolean {
  return status?.toUpperCase() === "TRIALING";
}

export function isRecoveryPlanSelection(mode: PlanSelectionMode): boolean {
  return mode === "recovery";
}

export function shouldLockCurrentPlanTier(mode: PlanSelectionMode): boolean {
  return mode !== "trial" && mode !== "recovery";
}

export function resolvePlanSelectionMode(input: {
  subscriptionStatus?: string | null;
  billingSource?: string | null;
  isBillingRecovery?: boolean;
  showTrialLayout?: boolean;
}): PlanSelectionMode {
  const {
    subscriptionStatus,
    billingSource,
    isBillingRecovery = false,
    showTrialLayout = false,
  } = input;

  if (
    isBillingRecovery ||
    isRecoverySubscriptionStatus(subscriptionStatus)
  ) {
    return "recovery";
  }
  if (isActivePaidStripeSubscription(billingSource, subscriptionStatus)) {
    return "paid-stripe";
  }
  if (showTrialLayout) {
    return "trial";
  }
  return "default";
}

export function getTierRelativePosition(
  currentIndex: number,
  targetIndex: number,
): TierRelativePosition {
  if (currentIndex < 0 || targetIndex < 0) return "unknown";
  if (targetIndex === currentIndex) return "same";
  if (targetIndex > currentIndex) return "higher";
  return "lower";
}

export function getTrialTierSubscribeLabel(
  tierName: string,
  position: TierRelativePosition,
): string {
  if (position === "same") return `Subscribe to ${tierName}`;
  if (position === "higher") return `Upgrade to ${tierName}`;
  return "Choose this plan";
}

export function getPaidTierChangeLabel(
  position: TierRelativePosition,
): string {
  if (position === "same") return "Current plan";
  if (position === "higher") return "Upgrade";
  if (position === "lower") return "Downgrade";
  return "Select plan";
}

export function getRecoveryTierSubscribeLabel(isSameTier: boolean): string {
  return isSameTier ? "Subscribe again" : "Choose this plan";
}

export function getTierActionLabel(
  tierName: string,
  currentIndex: number,
  targetIndex: number,
  mode: PlanSelectionMode,
): string {
  const position = getTierRelativePosition(currentIndex, targetIndex);
  if (mode === "recovery") {
    return getRecoveryTierSubscribeLabel(position === "same");
  }
  if (mode === "trial") {
    return getTrialTierSubscribeLabel(tierName, position);
  }
  if (mode === "paid-stripe" || mode === "default") {
    return getPaidTierChangeLabel(position);
  }
  return "Select plan";
}

export function getTierPosition(
  currentIndex: number,
  tierCount: number,
): TierPosition {
  if (tierCount <= 0 || currentIndex < 0) return "unknown";
  if (tierCount === 1) return "only";
  if (currentIndex === 0) return "lowest";
  if (currentIndex === tierCount - 1) return "highest";
  return "middle";
}

export function canUpgrade(position: TierPosition): boolean {
  return position === "lowest" || position === "middle";
}

export function canDowngrade(position: TierPosition): boolean {
  return position === "middle" || position === "highest";
}

export function canChangePlanBothWays(position: TierPosition): boolean {
  return position === "middle";
}

export function getPlanChangeButtonLabel(
  position: TierPosition,
  options?: { cancellationScheduled?: boolean },
): string {
  if (options?.cancellationScheduled) {
    return "Change plan";
  }
  if (position === "middle") return "Upgrade / Downgrade plan";
  if (position === "lowest") return "Upgrade plan";
  if (position === "highest") return "Downgrade plan";
  return "Change plan";
}

export function resolvePlanChangeDirection(
  planSelectionMode: PlanSelectionMode,
  requestedDirection: PlanChangeDirection = "both",
): PlanChangeDirection {
  if (planSelectionMode === "recovery" || planSelectionMode === "trial") {
    return "both";
  }
  return requestedDirection;
}

export function getPlanDialogTitle(
  planSelectionMode: PlanSelectionMode,
  changeDirection: PlanChangeDirection = "both",
): string {
  if (planSelectionMode === "recovery") {
    return "Choose a paid plan";
  }
  if (planSelectionMode === "trial") {
    return "Choose a paid plan";
  }
  if (planSelectionMode === "paid-stripe") {
    if (changeDirection === "upgrade") return "Upgrade plan";
    if (changeDirection === "downgrade") return "Downgrade plan";
    return "Change plan";
  }
  return "Choose a plan";
}
