"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PageTabs, PageTabsPanel } from "@/components/layout/page-tabs";
import { PaymentsEstimatesTab } from "@/features/payments/components/workspace/estimates-tab";
import { PaymentsInvoicesTab } from "@/features/payments/components/workspace/invoices-tab";
import { PaymentsOverviewTab } from "@/features/payments/components/workspace/overview-tab";
import { PaymentsTransactionsTab } from "@/features/payments/components/workspace/transactions-tab";
import {
  PAYMENTS_TAB_LABELS,
  PAYMENTS_WORKSPACE_TABS,
  buildPaymentsWorkspaceHref,
  parsePaymentsWorkspaceTab,
  type PaymentsWorkspaceTab,
} from "@/features/payments/workspace/payments-workspace";

export function PaymentsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parsePaymentsWorkspaceTab(searchParams.get("tab"));

  const setActiveTab = useCallback(
    (tab: PaymentsWorkspaceTab, action?: "create") => {
      router.replace(buildPaymentsWorkspaceHref(pathname, tab, action), {
        scroll: false,
      });
    },
    [router, pathname],
  );

  return (
    <PageContainer className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Payments"
        description="Quotes, invoices, and money received — one place for your customer billing workflow."
      />

      <PageTabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(parsePaymentsWorkspaceTab(value))
        }
        tabs={PAYMENTS_WORKSPACE_TABS.map((tab) => ({
          value: tab,
          label: PAYMENTS_TAB_LABELS[tab],
        }))}
        className="flex min-h-0 flex-1 flex-col gap-[var(--page-stack-gap)]"
      >
        <PageTabsPanel
          value="overview"
          className="mt-0 min-h-0 flex-1 space-y-0"
        >
          {activeTab === "overview" ? (
            <PaymentsOverviewTab />
          ) : null}
        </PageTabsPanel>

        <PageTabsPanel
          value="estimates"
          className="mt-0 min-h-0 flex-1 space-y-0"
        >
          {activeTab === "estimates" ? <PaymentsEstimatesTab /> : null}
        </PageTabsPanel>

        <PageTabsPanel
          value="invoices"
          className="mt-0 min-h-0 flex-1 space-y-0"
        >
          {activeTab === "invoices" ? <PaymentsInvoicesTab /> : null}
        </PageTabsPanel>

        <PageTabsPanel
          value="transactions"
          className="mt-0 min-h-0 flex-1 space-y-0"
        >
          {activeTab === "transactions" ? (
            <PaymentsTransactionsTab />
          ) : null}
        </PageTabsPanel>
      </PageTabs>
    </PageContainer>
  );
}
