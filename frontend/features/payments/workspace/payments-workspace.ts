import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateEstimateLists,
  invalidateInvoiceLists,
  invalidatePaymentLists,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  FileCheck,
  FileText,
  LayoutGrid,
} from "lucide-react";

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

export const PAYMENTS_TAB_ICONS: Record<PaymentsWorkspaceTab, LucideIcon> = {
  overview: LayoutGrid,
  estimates: FileText,
  invoices: FileCheck,
  transactions: ArrowLeftRight,
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

export interface PaymentsWorkspaceHrefOptions {
  action?: "create";
  status?: string;
}

export function buildPaymentsWorkspaceHref(
  pathname: string,
  tab: PaymentsWorkspaceTab,
  options?: PaymentsWorkspaceHrefOptions | "create",
): string {
  const resolved =
    options === "create"
      ? { action: "create" as const,
}
      : (options ?? {});

  const next = new URLSearchParams();
  if (tab !== "overview") {
    next.set("tab", tab);
  }
  if (resolved.action) {
    next.set("action", resolved.action);
  }
  if (resolved.status) {
    next.set("status", resolved.status);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
