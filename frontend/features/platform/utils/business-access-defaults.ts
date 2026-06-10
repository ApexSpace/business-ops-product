import type {
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";

export type UnpaidAccessMode = "TRIAL" | "PENDING_PAYMENT" | "INTERNAL";

export interface UnpaidAccessOption {
  value: UnpaidAccessMode;
  label: string;
  description: string;
}

export const UNPAID_ACCESS_OPTIONS: UnpaidAccessOption[] = [
  {
    value: "TRIAL",
    label: "Start trial",
    description: "Grant workspace access for a limited trial period.",
  },
  {
    value: "PENDING_PAYMENT",
    label: "Pending payment",
    description: "Create the workspace but block access until payment is received.",
  },
  {
    value: "INTERNAL",
    label: "Internal / test",
    description: "Free internal account for demos, QA, or platform testing.",
  },
];

export interface AccessFieldDefaults {
  businessStatus: BusinessAccessStatus;
  subscriptionStatus: SubscriptionAccessStatus;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

export function applySubscriptionStatusDefaults(
  subscriptionStatus: SubscriptionAccessStatus,
): {
  businessStatus: BusinessAccessStatus;
  paymentMethod: SubscriptionPaymentMethod;
  paymentStatus: SubscriptionPaymentStatus;
} {
  switch (subscriptionStatus) {
    case "TRIALING":
      return {
        businessStatus: "ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "NOT_REQUIRED",
      };
    case "ACTIVE":
      return {
        businessStatus: "ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "PAID",
      };
    case "PENDING_PAYMENT":
      return {
        businessStatus: "NOT_ACTIVE",
        paymentMethod: "MANUAL_INVOICE",
        paymentStatus: "PENDING",
      };
    case "INTERNAL":
      return {
        businessStatus: "ACTIVE",
        paymentMethod: "FREE_INTERNAL",
        paymentStatus: "NOT_REQUIRED",
      };
    case "EXPIRED":
      return {
        businessStatus: "NOT_ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "PENDING",
      };
    case "CANCELED":
      return {
        businessStatus: "NOT_ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "NOT_REQUIRED",
      };
    default:
      return {
        businessStatus: "NOT_ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "NOT_REQUIRED",
      };
  }
}

export function deriveAccessFromPaymentChoice(input: {
  paymentCollected: boolean;
  unpaidAccessMode?: UnpaidAccessMode;
}): AccessFieldDefaults {
  if (input.paymentCollected) {
    return {
      businessStatus: "ACTIVE",
      subscriptionStatus: "ACTIVE",
      paymentMethod: "MANUAL_INVOICE",
      paymentStatus: "PAID",
      currentPeriodStart: toDateInputValue(new Date()),
    };
  }

  const mode = input.unpaidAccessMode ?? "TRIAL";

  switch (mode) {
    case "TRIAL":
      return {
        businessStatus: "ACTIVE",
        subscriptionStatus: "TRIALING",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "NOT_REQUIRED",
        currentPeriodStart: toDateInputValue(new Date()),
        currentPeriodEnd: getDefaultTrialEnd(14),
      };
    case "PENDING_PAYMENT":
      return {
        businessStatus: "NOT_ACTIVE",
        subscriptionStatus: "PENDING_PAYMENT",
        paymentMethod: "MANUAL_INVOICE",
        paymentStatus: "PENDING",
      };
    case "INTERNAL":
      return {
        businessStatus: "ACTIVE",
        subscriptionStatus: "INTERNAL",
        paymentMethod: "FREE_INTERNAL",
        paymentStatus: "NOT_REQUIRED",
      };
    default:
      return {
        businessStatus: "NOT_ACTIVE",
        subscriptionStatus: "TRIALING",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "NOT_REQUIRED",
      };
  }
}

export function getCreateSuccessToast(input: {
  paymentCollected: boolean;
  unpaidAccessMode?: UnpaidAccessMode;
  paymentRecorded?: boolean;
}): string {
  if (input.paymentCollected && input.paymentRecorded) {
    return "Business created and payment recorded.";
  }
  if (!input.paymentCollected && input.unpaidAccessMode === "PENDING_PAYMENT") {
    return "Business created as pending payment.";
  }
  if (!input.paymentCollected && input.unpaidAccessMode === "TRIAL") {
    return "Trial business created.";
  }
  return "Business created successfully.";
}

export function getDefaultTrialEnd(days = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export function splitFullName(fullName?: string): {
  firstName?: string;
  lastName?: string;
} {
  const trimmed = fullName?.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function getAccessWarnings(input: {
  businessStatus?: BusinessAccessStatus;
  subscriptionStatus?: SubscriptionAccessStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentStatus?: SubscriptionPaymentStatus;
  planTierId?: string | null;
  currentPeriodEnd?: string | null;
  paymentCollected?: boolean;
  unpaidAccessMode?: UnpaidAccessMode;
}): string[] {
  const warnings: string[] = [];

  if (input.businessStatus === "SUSPENDED") {
    warnings.push("Suspended businesses will have workspace access blocked.");
  }

  if (
    !input.paymentCollected &&
    input.unpaidAccessMode === "TRIAL" &&
    !input.currentPeriodEnd
  ) {
    warnings.push("Trial businesses require a trial end date.");
  }

  if (
    input.paymentCollected &&
    input.subscriptionStatus === "ACTIVE" &&
    !input.planTierId
  ) {
    warnings.push("Paid subscriptions normally include a plan tier.");
  }

  if (
    input.subscriptionStatus === "TRIALING" &&
    !input.currentPeriodEnd
  ) {
    warnings.push("Trialing subscriptions require a period end date.");
  }

  return warnings;
}

export function hasBlockingAccessWarnings(input: {
  paymentCollected?: boolean;
  unpaidAccessMode?: UnpaidAccessMode;
  subscriptionStatus?: SubscriptionAccessStatus;
  currentPeriodEnd?: string | null;
  amount?: string | null;
  paymentMethod?: SubscriptionPaymentMethod;
}): boolean {
  if (input.paymentCollected) {
    if (!input.amount || Number(input.amount) <= 0) return true;
    if (
      !input.paymentMethod ||
      input.paymentMethod === "NOT_SELECTED" ||
      input.paymentMethod === "FREE_INTERNAL"
    ) {
      return true;
    }
    return false;
  }

  if (input.unpaidAccessMode === "TRIAL" && !input.currentPeriodEnd) {
    return true;
  }

  if (
    input.unpaidAccessMode === "PENDING_PAYMENT" &&
    input.subscriptionStatus === "PENDING_PAYMENT" &&
    !input.currentPeriodEnd
  ) {
    return false;
  }

  return false;
}
