import type { BusinessTenantAccess } from "@/lib/business-access/types";
import { SubscriptionPaymentStatus, SubscriptionStatus } from "./subscription-enums";

export type AccessMessage = {
  title: string;
  message: string;
  primaryCta: string;
  secondaryCtas: string[];
};

export type BannerMessage = {
  message: string;
  tone: "warning" | "info";
};

const ACCESS_BLOCKED_MESSAGES: Record<string, AccessMessage> = {
  BUSINESS_NOT_ACTIVE: {
    title: "Workspace not active",
    message:
      "Your workspace is not active yet. Please contact support if you believe this is a mistake.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace", "Go to login"],
  },
  BUSINESS_SUSPENDED: {
    title: "Workspace suspended",
    message:
      "Your workspace has been suspended. Please contact support to restore access.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace", "Go to login"],
  },
  BUSINESS_PENDING_PAYMENT: {
    title: "Payment required",
    message:
      "Your workspace is pending payment. Please complete payment or contact support to activate your account.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  BUSINESS_TRIAL_EXPIRED: {
    title: "Trial ended",
    message:
      "Your trial has expired. Contact support to continue using your workspace.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  TRIAL_EXPIRED: {
    title: "Trial ended",
    message:
      "Your trial has expired. Contact support to continue using your workspace.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  BUSINESS_ACCESS_EXPIRED: {
    title: "Access expired",
    message:
      "Your access period has expired. Please contact support to renew your access.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  SUBSCRIPTION_EXPIRED: {
    title: "Access expired",
    message:
      "Your access period has expired. Please contact support to renew your access.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  BUSINESS_SUBSCRIPTION_CANCELED: {
    title: "Subscription canceled",
    message:
      "Your subscription has been canceled. Please contact support if you want to reactivate your workspace.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  SUBSCRIPTION_CANCELED: {
    title: "Subscription canceled",
    message:
      "Your subscription has been canceled. Please contact support if you want to reactivate your workspace.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  NO_SUBSCRIPTION: {
    title: "No active subscription",
    message:
      "This workspace does not have an active subscription yet. Please contact support.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  SUBSCRIPTION_PENDING_PAYMENT: {
    title: "Payment required",
    message:
      "Your workspace is pending payment. Please complete payment or contact support to activate your account.",
    primaryCta: "Contact support",
    secondaryCtas: ["Switch workspace"],
  },
  FEATURE_NOT_AVAILABLE: {
    title: "Feature not included",
    message: "This feature is not included in your current package.",
    primaryCta: "Contact support",
    secondaryCtas: ["Go to dashboard", "View plan"],
  },
};

const MODULE_LABELS: Record<string, string> = {
  payments: "Payments",
  conversations: "Conversations",
  appointments: "Appointments",
  calendar: "Calendars",
  ai_agents: "AI Agents",
  contacts: "Contacts",
  pipelines: "Pipelines",
};

function mapReasonCodeToMessageKey(reasonCode: string): string {
  switch (reasonCode) {
    case "TRIAL_EXPIRED":
      return "BUSINESS_TRIAL_EXPIRED";
    case "SUBSCRIPTION_EXPIRED":
      return "BUSINESS_ACCESS_EXPIRED";
    case "SUBSCRIPTION_CANCELED":
      return "BUSINESS_SUBSCRIPTION_CANCELED";
    case "SUBSCRIPTION_PENDING_PAYMENT":
      return "BUSINESS_PENDING_PAYMENT";
    default:
      return reasonCode;
  }
}

export function resolveAccessMessageKey(reasonCode: string): string {
  return mapReasonCodeToMessageKey(reasonCode);
}

export function getContextCardBadge(reasonCode: string): string {
  return getAccessBlockedMessage(mapReasonCodeToMessageKey(reasonCode)).title;
}

export function getAccessBlockedMessage(reasonCode: string): AccessMessage {
  const key = mapReasonCodeToMessageKey(reasonCode);
  return (
    ACCESS_BLOCKED_MESSAGES[key] ?? {
      title: "Workspace unavailable",
      message: "You cannot access this workspace right now. Please contact support.",
      primaryCta: "Contact support",
      secondaryCtas: ["Switch workspace"],
    }
  );
}

export function getFeatureUnavailableMessage(moduleKey: string): AccessMessage {
  const label = MODULE_LABELS[moduleKey] ?? "This feature";
  return {
    title: "Feature not included",
    message: `${label} are not included in your current package.`,
    primaryCta: "Contact support",
    secondaryCtas: ["Go to dashboard", "View plan"],
  };
}

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function getBannerMessage(
  access: BusinessTenantAccess,
): BannerMessage | null {
  if (access.subscription?.status === SubscriptionStatus.INTERNAL) {
    return null;
  }

  const sub = access.subscription;
  if (!sub) return null;

  if (sub.paymentStatus === SubscriptionPaymentStatus.PENDING) {
    return {
      message:
        "Payment is pending for your workspace. Please contact support.",
      tone: "warning",
    };
  }

  if (sub.status === SubscriptionStatus.TRIALING && sub.currentPeriodEnd) {
    const days = daysUntil(new Date(sub.currentPeriodEnd));
    if (days <= 3) {
      return {
        message: `Your trial ends in ${days} day${days === 1 ? "" : "s"}. Contact support to continue using your workspace.`,
        tone: "warning",
      };
    }
    return {
      message: `Your trial ends in ${days} day${days === 1 ? "" : "s"}.`,
      tone: "info",
    };
  }

  const needsSubAttention =
    access.needsAttention.includes("ACTIVE_WITH_EXPIRED_SUBSCRIPTION") ||
    access.needsAttention.includes("ACTIVE_WITH_CANCELED_SUBSCRIPTION");

  if (needsSubAttention) {
    return {
      message:
        "There is an issue with your subscription. Please contact support.",
      tone: "warning",
    };
  }

  if (access.warnings.length > 0) {
    return {
      message: access.warnings[0]!,
      tone: "info",
    };
  }

  return null;
}
