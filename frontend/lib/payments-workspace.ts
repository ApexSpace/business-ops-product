import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateEstimateLists,
  invalidateInvoiceLists,
  invalidatePaymentLists,
} from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";

export const PAYMENTS_WORKSPACE_TABS = [
  "overview",
  "estimates",
  "invoices",
  "transactions",
] as const;

export type PaymentsWorkspaceTab = (typeof PAYMENTS_WORKSPACE_TABS)[number];

export const PAYMENTS_TAB_LABELS: Record<PaymentsWorkspaceTab, string> = {
  overview: "Overview",
  estimates: "Estimates",
  invoices: "Invoices",
  transactions: "Transactions",
};

export function parsePaymentsWorkspaceTab(
  value: string | null | undefined,
): PaymentsWorkspaceTab {
  if (value === "received") {
    return "transactions";
  }
  if (value && PAYMENTS_WORKSPACE_TABS.includes(value as PaymentsWorkspaceTab)) {
    return value as PaymentsWorkspaceTab;
  }
  return "overview";
}

export function invalidateFinancialLists(queryClient: QueryClient) {
  return Promise.all([
    invalidateEstimateLists(queryClient),
    invalidateInvoiceLists(queryClient),
    invalidatePaymentLists(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.overview() }),
  ]);
}

export function buildPaymentsWorkspaceHref(
  pathname: string,
  tab: PaymentsWorkspaceTab,
  action?: "create",
): string {
  const next = new URLSearchParams();
  if (tab !== "overview") {
    next.set("tab", tab);
  }
  if (action) {
    next.set("action", action);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
