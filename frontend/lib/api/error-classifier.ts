import { ApiClientError } from "./errors";

export type ApiErrorCategory =
  | "auth"
  | "business_access"
  | "capability"
  | "role"
  | "other";

const BUSINESS_ACCESS_CODES = new Set([
  "BUSINESS_NOT_ACTIVE",
  "BUSINESS_SUSPENDED",
  "BUSINESS_PENDING_PAYMENT",
  "BUSINESS_ACCESS_EXPIRED",
  "BUSINESS_TRIAL_EXPIRED",
  "BUSINESS_SUBSCRIPTION_CANCELED",
  "NO_SUBSCRIPTION",
]);

const CAPABILITY_CODES = new Set([
  "FEATURE_NOT_AVAILABLE",
  "CAPABILITY_NOT_INCLUDED",
  "MODULE_NOT_INCLUDED",
]);

const ROLE_CODES = new Set(["FORBIDDEN", "ROLE_NOT_ALLOWED", "PERMISSION_DENIED"]);

export function classifyApiError(error: unknown): ApiErrorCategory {
  if (!(error instanceof ApiClientError)) {
    return "other";
  }

  if (error.status === 401) {
    return "auth";
  }

  const code = error.code ?? "";
  if (BUSINESS_ACCESS_CODES.has(code)) {
    return "business_access";
  }
  if (CAPABILITY_CODES.has(code)) {
    return "capability";
  }
  if (ROLE_CODES.has(code) || (error.status === 403 && code === "FORBIDDEN")) {
    return "role";
  }

  return "other";
}

export function isAuthSessionError(error: unknown): boolean {
  return classifyApiError(error) === "auth";
}

export function isBusinessAccessError(error: unknown): boolean {
  return classifyApiError(error) === "business_access";
}

export function isCapabilityError(error: unknown): boolean {
  return classifyApiError(error) === "capability";
}

export const BUSINESS_ACCESS_BLOCKED_EVENT = "business-access-blocked";
export const FEATURE_UNAVAILABLE_EVENT = "feature-unavailable";

export function emitBusinessAccessBlocked(detail: {
  code?: string;
  message: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BUSINESS_ACCESS_BLOCKED_EVENT, { detail }),
  );
}

export function emitFeatureUnavailable(detail: {
  code?: string;
  message: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FEATURE_UNAVAILABLE_EVENT, { detail }),
  );
}
