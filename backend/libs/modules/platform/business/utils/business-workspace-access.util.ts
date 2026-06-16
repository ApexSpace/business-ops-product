import { BusinessStatus } from '@prisma/client';
import { Request } from 'express';
import { BusinessAccessReasonCode } from '../types/business-access-resolution.types';

const BILLING_RECOVERY_REASON_CODES = new Set<BusinessAccessReasonCode>([
  'SUBSCRIPTION_PENDING_PAYMENT',
  'TRIAL_EXPIRED',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_CANCELED',
  'SUBSCRIPTION_PAST_DUE',
  'NO_SUBSCRIPTION',
  'SUBSCRIPTION_UNKNOWN',
]);

/** Workspace can be selected and loaded in the app shell. */
export function canSelectBusinessWorkspace(
  businessStatus: BusinessStatus,
): boolean {
  return businessStatus === BusinessStatus.ACTIVE;
}

export function isBillingRecoveryReason(
  reasonCode: BusinessAccessReasonCode,
): boolean {
  return BILLING_RECOVERY_REASON_CODES.has(reasonCode);
}

export function isBillingRecoveryMode(
  businessStatus: BusinessStatus,
  canAccessWorkspace: boolean,
  reasonCode: BusinessAccessReasonCode,
): boolean {
  return (
    canSelectBusinessWorkspace(businessStatus) &&
    !canAccessWorkspace &&
    isBillingRecoveryReason(reasonCode)
  );
}

function normalizeRequestPath(req: Request): string {
  return (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
}

/** Endpoints allowed when subscription access is blocked but workspace is active. */
export function isBillingRecoveryAllowedRequest(req: Request): boolean {
  const url = normalizeRequestPath(req);
  const method = req.method.toUpperCase();

  if (method === 'GET' && url.includes('/auth/me')) {
    return true;
  }
  if (method === 'GET' && url.includes('/businesses/current/access')) {
    return true;
  }
  if (method === 'GET' && url.endsWith('/businesses/current')) {
    return true;
  }
  if (method === 'GET' && url.includes('/businesses/current/dashboard-stats')) {
    return true;
  }
  if (method === 'GET' && url.includes('/businesses/current/plan-options')) {
    return true;
  }
  if (method === 'GET' && url.includes('/businesses/current/snapshot-context')) {
    return true;
  }
  if (url.includes('/billing/stripe/')) {
    return true;
  }
  if (url.includes('/billing/subscribe')) {
    return true;
  }
  if (url.includes('/cancel-subscription')) {
    return true;
  }
  if (url.includes('/resume-subscription')) {
    return true;
  }
  if (url.includes('/change-plan-tier')) {
    return true;
  }

  return false;
}

export function resolveBusinessStatusForBillingChange(
  currentStatus: BusinessStatus,
): BusinessStatus {
  if (currentStatus === BusinessStatus.SUSPENDED) {
    return BusinessStatus.SUSPENDED;
  }
  return BusinessStatus.ACTIVE;
}
