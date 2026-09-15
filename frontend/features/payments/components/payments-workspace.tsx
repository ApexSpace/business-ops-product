"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  TabbedWorkspaceLayout,
  PageTabsPanel,
} from "@/components/layout/tabbed-workspace-layout";
import { PaymentsEstimatesTab } from "@/features/payments/components/workspace/estimates-tab";
import { PaymentsInvoicesTab } from "@/features/payments/components/workspace/invoices-tab";
import { PaymentsOverviewTab } from "@/features/payments/components/workspace/overview-tab";
import { PaymentsTransactionsTab } from "@/features/payments/components/workspace/transactions-tab";
import {
  PAYMENTS_TAB_ICONS,
  PAYMENTS_TAB_LABELS,
  PAYMENTS_WORKSPACE_TABS,
  buildPaymentsWorkspaceHref,
  parsePaymentsWorkspaceTab,
  type PaymentsWorkspaceTab,
} from "@/features/payments/workspace/payments-workspace";
import { useIsMobile } from "@/lib/hooks/use-mobile";

export function PaymentsWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const activeTab = parsePaymentsWorkspaceTab(searchParams.get("tab"));

  const setActiveTab = useCallback(
    (tab: PaymentsWorkspaceTab, options?: { action?: "create" }) => {
      router.replace(buildPaymentsWorkspaceHref(pathname, tab, options), {
        scroll: false,
      });
    },
    [router, pathname],
  );

  const tabs = PAYMENTS_WORKSPACE_TABS.map((tab) => {
    const Icon = PAYMENTS_TAB_ICONS[tab];
    return {
      value: tab,
      label: (
        <span className="flex min-w-0 items-center justify-center gap-1 sm:gap-1.5">
          <Icon className="size-3 shrink-0 sm:size-3.5" aria-hidden />
          <span className="text-[clamp(0.5625rem,2.35vw,0.8125rem)] leading-tight font-semibold">
            {PAYMENTS_TAB_LABELS[tab]}
          </span>
        </span>
      ),
    };
  });

  /** Full-screen mobile list — skip Payments chrome on list tabs only. */
  if (
    isMobile &&
    (activeTab === "transactions" ||
      activeTab === "estimates" ||
      activeTab === "invoices")
  ) {
    return (
      <TabbedWorkspaceLayout
        title="Payments"
        value={activeTab}
        onValueChange={() => undefined}
        tabs={tabs}
        bypassChrome
      >
        {activeTab === "estimates" ? <PaymentsEstimatesTab /> : null}
        {activeTab === "invoices" ? <PaymentsInvoicesTab /> : null}
        {activeTab === "transactions" ? <PaymentsTransactionsTab /> : null}
      </TabbedWorkspaceLayout>
    );
  }

  return (
    <TabbedWorkspaceLayout
      title="Payments"
      description="Quotes, invoices, and money received — one place for your customer billing workflow."
      value={activeTab}
      onValueChange={(value) =>
        setActiveTab(parsePaymentsWorkspaceTab(value))
      }
      tabs={tabs}
      listClassName="!h-auto min-h-10 w-full flex-nowrap gap-0.5 rounded-xl border border-border bg-card p-1 sm:min-h-11 sm:gap-1 sm:p-1.5"
      triggerClassName="!h-auto min-h-8 min-w-0 flex-1 gap-0 rounded-lg px-1 py-2 font-semibold text-muted-foreground shadow-none after:hidden data-active:bg-primary/10 data-active:text-primary data-active:shadow-none hover:bg-muted/40 hover:text-foreground sm:min-h-9 sm:gap-1.5 sm:px-2.5 sm:py-2.5 sm:text-[13px] md:px-3"
    >
      <PageTabsPanel
        value="overview"
        className="mt-0 min-h-0 flex-1 space-y-0"
      >
        {activeTab === "overview" ? <PaymentsOverviewTab /> : null}
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
        {activeTab === "transactions" ? <PaymentsTransactionsTab /> : null}
      </PageTabsPanel>
    </TabbedWorkspaceLayout>
  );
}
