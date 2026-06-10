import type {
  BusinessAccessStatus,
  SubscriptionAccessStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from "@/features/platform/types/business-access";

export type CreateBusinessScenario =
  | "paid"
  | "trial"
  | "pending_payment"
  | "internal"
  | "custom";

export interface ScenarioOption {
  value: CreateBusinessScenario;
  label: string;
  description: string;
  summary: string;
}

export const CREATE_BUSINESS_SCENARIOS: ScenarioOption[] = [
  {
    value: "paid",
    label: "Paid Customer",
    description: "Active workspace with a paid subscription ready to use.",
    summary: "Active business · Active subscription · Paid",
  },
  {
    value: "trial",
    label: "Trial Customer",
    description: "Full access during a trial period before billing starts.",
    summary: "Active business · Trialing · Period end required",
  },
  {
    value: "pending_payment",
    label: "Pending Payment",
    description: "Workspace created but gated until payment is received.",
    summary: "Not active · Pending payment · Manual invoice",
  },
  {
    value: "internal",
    label: "Internal / Test",
    description: "Free internal account for demos, QA, or platform testing.",
    summary: "Active business · Internal · Free internal",
  },
  {
    value: "custom",
    label: "Custom Package",
    description: "Start with pending payment defaults and configure plan manually.",
    summary: "Not active · Pending payment · Configure plan",
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

export function applyScenarioDefaults(
  scenario: CreateBusinessScenario,
): AccessFieldDefaults {
  switch (scenario) {
    case "paid":
      return {
        businessStatus: "ACTIVE",
        subscriptionStatus: "ACTIVE",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "PAID",
      };
    case "trial":
      return {
        businessStatus: "ACTIVE",
        subscriptionStatus: "TRIALING",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "NOT_REQUIRED",
        currentPeriodStart: toDateInputValue(new Date()),
        currentPeriodEnd: getDefaultTrialEnd(14),
      };
    case "pending_payment":
      return {
        businessStatus: "NOT_ACTIVE",
        subscriptionStatus: "PENDING_PAYMENT",
        paymentMethod: "MANUAL_INVOICE",
        paymentStatus: "PENDING",
      };
    case "internal":
      return {
        businessStatus: "ACTIVE",
        subscriptionStatus: "INTERNAL",
        paymentMethod: "FREE_INTERNAL",
        paymentStatus: "NOT_REQUIRED",
      };
    case "custom":
      return {
        businessStatus: "NOT_ACTIVE",
        subscriptionStatus: "PENDING_PAYMENT",
        paymentMethod: "NOT_SELECTED",
        paymentStatus: "PENDING",
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

export function getDefaultTrialEnd(days = 14): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getAccessWarnings(input: {
  businessStatus?: BusinessAccessStatus;
  subscriptionStatus?: SubscriptionAccessStatus;
  paymentMethod?: SubscriptionPaymentMethod;
  paymentStatus?: SubscriptionPaymentStatus;
  planTierId?: string | null;
  currentPeriodEnd?: string | null;
}): string[] {
  const warnings: string[] = [];

  if (input.businessStatus === "SUSPENDED") {
    warnings.push("Suspended businesses will have workspace access blocked.");
  }

  if (input.subscriptionStatus === "TRIALING" && !input.currentPeriodEnd) {
    warnings.push("Trialing subscriptions require a period end date.");
  }

  if (input.subscriptionStatus === "ACTIVE" && !input.planTierId) {
    warnings.push("Active subscriptions normally require a plan tier assignment.");
  }

  if (
    input.subscriptionStatus === "INTERNAL" &&
    input.paymentMethod &&
    input.paymentMethod !== "FREE_INTERNAL"
  ) {
    warnings.push("Internal accounts should use FREE_INTERNAL payment method.");
  }

  if (
    input.subscriptionStatus === "PENDING_PAYMENT" &&
    input.paymentStatus &&
    input.paymentStatus !== "PENDING"
  ) {
    warnings.push("Pending payment subscriptions should use PENDING payment status.");
  }

  return warnings;
}

export function hasBlockingAccessWarnings(input: {
  subscriptionStatus?: SubscriptionAccessStatus;
  currentPeriodEnd?: string | null;
}): boolean {
  return (
    input.subscriptionStatus === "TRIALING" && !input.currentPeriodEnd
  );
}
