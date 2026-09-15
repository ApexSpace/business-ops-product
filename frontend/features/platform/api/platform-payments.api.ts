import { api } from "@/lib/api/client";

export type PlatformPaymentHubSource = "SAAS_SUBSCRIPTION" | "FORM";

export type PlatformPaymentHubRow = {
  id: string;
  source: PlatformPaymentHubSource;
  sourceLabel: string;
  amount: string;
  currency: string;
  status: string;
  livemode: boolean;
  paidAt: string | null;
  createdAt: string;
  contextTitle: string;
  contextSubtitle?: string;
  contextHref?: string;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  externalPaymentId?: string | null;
};

export type PlatformPaymentsHubFilters = {
  page?: number;
  limit?: number;
  source?: PlatformPaymentHubSource;
  status?: string;
  q?: string;
  livemode?: boolean;
};

export type PlatformPaymentsModeSummary = {
  paymentsMode: "live" | "test";
  testModeConfigured: boolean;
  modeLabel?: string | null;
  livemode: boolean;
};

export function listPlatformPayments(filters: PlatformPaymentsHubFilters = {}) {
  return api.getPaginated<PlatformPaymentHubRow>("platform/payments", {
    searchParams: filters,
  });
}

export function getPlatformPaymentsMode() {
  return api.get<PlatformPaymentsModeSummary>("platform/payments/mode");
}

export function updatePlatformPaymentsMode(mode: "live" | "test") {
  return api.patch<PlatformPaymentsModeSummary>("platform/payments/mode", {
    mode,
  });
}
