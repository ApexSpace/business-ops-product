import { api } from "@/lib/api/client";

export type StripeConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTED_INCOMPLETE"
  | "READY";

export type PrimaryPaymentAccount = {
  connectionStatus: StripeConnectionStatus;
  ready: boolean;
  stripeAccountId?: string | null;
  accountName?: string | null;
  readinessLabel?: string | null;
  modeLabel?: string | null;
  defaultCurrency?: string | null;
  country?: string | null;
  livemode: boolean;
  paymentsMode?: "live" | "test";
  testModeConfigured?: boolean;
  publishableKey?: string | null;
};

export function getPrimaryPaymentAccount() {
  return api.get<PrimaryPaymentAccount>("payment-accounts/primary");
}

export function updatePaymentsMode(mode: "live" | "test") {
  return api.patch<PrimaryPaymentAccount>("payment-accounts/payments-mode", {
    mode,
  });
}

export function createStripeOnboardingLink() {
  return api.post<{ url: string }>(
    "integrations/business/stripe/onboarding-link",
    {},
  );
}

export function createStripeDashboardLink() {
  return api.post<{ url: string }>(
    "integrations/business/stripe/dashboard-link",
    {},
  );
}
