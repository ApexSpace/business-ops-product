import type {
  BusinessAccessReasonCode,
  BusinessTenantAccess,
  TenantAccessSubscription,
} from "./types";

const BILLING_RECOVERY_REASON_CODES = new Set<BusinessAccessReasonCode>([
  "SUBSCRIPTION_PENDING_PAYMENT",
  "TRIAL_EXPIRED",
  "SUBSCRIPTION_EXPIRED",
  "SUBSCRIPTION_CANCELED",
  "SUBSCRIPTION_PAST_DUE",
  "NO_SUBSCRIPTION",
  "SUBSCRIPTION_UNKNOWN",
]);

const BILLING_RECOVERY_SUBSCRIPTION_STATUSES = new Set([
  "CANCELED",
  "EXPIRED",
  "PAST_DUE",
  "PENDING_PAYMENT",
]);

export function isBillingRecoveryReason(
  reasonCode?: string | null,
): reasonCode is BusinessAccessReasonCode {
  return Boolean(
    reasonCode &&
      BILLING_RECOVERY_REASON_CODES.has(reasonCode as BusinessAccessReasonCode),
  );
}

export function isBillingRecoverySubscriptionStatus(
  status?: string | null,
): boolean {
  if (!status) return false;
  return BILLING_RECOVERY_SUBSCRIPTION_STATUSES.has(status.toUpperCase());
}

export function isBillingRecoveryState(
  access?: BusinessTenantAccess | null,
  subscription?: TenantAccessSubscription | null,
): boolean {
  if (!access) return false;
  if (isWorkspaceHardBlocked(access)) return false;
  if (access.businessStatus !== "ACTIVE") return false;

  const sub = subscription ?? access.subscription;
  if (isBillingRecoverySubscriptionStatus(sub?.status)) {
    return true;
  }

  if (!access.canAccessWorkspace && isBillingRecoveryReason(access.reasonCode)) {
    return true;
  }

  return false;
}

export function isBillingRecoveryAccess(
  access?: BusinessTenantAccess | null,
): boolean {
  return isBillingRecoveryState(access);
}

export function isWorkspaceHardBlocked(
  access?: BusinessTenantAccess | null,
): boolean {
  if (!access) return false;
  return (
    access.businessStatus === "NOT_ACTIVE" ||
    access.businessStatus === "SUSPENDED" ||
    access.businessStatus === "ARCHIVED" ||
    access.reasonCode === "BUSINESS_NOT_ACTIVE" ||
    access.reasonCode === "BUSINESS_SUSPENDED"
  );
}

const BILLING_RECOVERY_SAFE_PREFIXES = [
  "/business/settings/billing",
  "/business/billing",
];

export function isBillingRecoverySafeRoute(pathname: string): boolean {
  const normalized = pathname.split("?")[0];
  return BILLING_RECOVERY_SAFE_PREFIXES.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  );
}
