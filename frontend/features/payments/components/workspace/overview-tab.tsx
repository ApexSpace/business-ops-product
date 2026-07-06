"use client";

import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  FileCheck,
  FileText,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FinancialSummaryCard } from "@/features/payments/components/financial-summary-card";
import { EmptyState } from "@/components/data-display/empty-state";
import { LoadingState } from "@/components/data-display/loading-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/features/invoices/schemas/invoice-profile";
import { queryKeys } from "@/lib/query/keys";
import type { PaymentsOverview } from "@/features/payments/types";
import { getPaymentsOverview } from "@/features/payments/api/payments.api";
import {
  buildPaymentsWorkspaceHref,
  type PaymentsWorkspaceTab,
} from "@/features/payments/workspace/payments-workspace";

function formatMetricAmount(amount: string): string {
  return formatMoney(amount);
}

function isOverviewEmpty(data: PaymentsOverview): boolean {
  const metrics = [
    data.invoices.draft,
    data.invoices.due,
    data.invoices.received,
    data.invoices.overdue,
    data.estimates.sent,
    data.estimates.approved,
    data.estimates.rejected,
    data.estimates.converted,
  ];
  return metrics.every((m) => m.count === 0 && parseFloat(m.amount) === 0);
}

const CARD_GRID =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4";

export function PaymentsOverviewTab() {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payments.overview(),
    queryFn: () => getPaymentsOverview(),
  });

  const navigate = (tab: PaymentsWorkspaceTab, status?: string) => {
    router.replace(buildPaymentsWorkspaceHref(pathname, tab, { status }), {
      scroll: false,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingState variant="skeleton" rows={1} />
        <LoadingState variant="skeleton" rows={1} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load summary"
        description="Refresh to try again."
        action={
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const empty = isOverviewEmpty(data);

  return (
    <div className="space-y-6">
      <div className={CARD_GRID}>
        <FinancialSummaryCard
          label="Draft"
          count={data.invoices.draft.count}
          amount={formatMetricAmount(data.invoices.draft.amount)}
          icon={FileText}
          tone="neutral"
          viewLabel="View drafts"
          onClick={() => navigate("invoices", "DRAFT")}
        />
        <FinancialSummaryCard
          label="Due"
          count={data.invoices.due.count}
          amount={formatMetricAmount(data.invoices.due.amount)}
          icon={Banknote}
          tone="amber"
          viewLabel="View due"
          onClick={() => navigate("invoices")}
        />
        <FinancialSummaryCard
          label="Received"
          count={data.invoices.received.count}
          amount={formatMetricAmount(data.invoices.received.amount)}
          icon={CheckCircle2}
          tone="green"
          viewLabel="View received"
          onClick={() => navigate("invoices", "PAID")}
        />
        <FinancialSummaryCard
          label="Overdue"
          count={data.invoices.overdue.count}
          amount={formatMetricAmount(data.invoices.overdue.amount)}
          icon={AlertCircle}
          tone="red"
          viewLabel="View overdue"
          onClick={() => navigate("invoices", "OVERDUE")}
        />
      </div>

      <div className={CARD_GRID}>
        <FinancialSummaryCard
          label="Sent"
          count={data.estimates.sent.count}
          amount={formatMetricAmount(data.estimates.sent.amount)}
          icon={Send}
          tone="blue"
          viewLabel="View sent"
          onClick={() => navigate("estimates", "SENT")}
        />
        <FinancialSummaryCard
          label="Accepted"
          count={data.estimates.approved.count}
          amount={formatMetricAmount(data.estimates.approved.amount)}
          icon={ThumbsUp}
          tone="green"
          viewLabel="View accepted"
          onClick={() => navigate("estimates", "APPROVED")}
        />
        <FinancialSummaryCard
          label="Declined"
          count={data.estimates.rejected.count}
          amount={formatMetricAmount(data.estimates.rejected.amount)}
          icon={ThumbsDown}
          tone="red"
          viewLabel="View declined"
          onClick={() => navigate("estimates", "REJECTED")}
        />
        <FinancialSummaryCard
          label="Invoiced"
          count={data.estimates.converted.count}
          amount={formatMetricAmount(data.estimates.converted.amount)}
          icon={FileCheck}
          tone="brand"
          viewLabel="View invoiced"
          onClick={() => navigate("estimates", "CONVERTED")}
        />
      </div>

      {empty ? (
        <EmptyState
          title="No financial activity yet"
          description="Create your first estimate or invoice to start tracking payments."
        />
      ) : null}
    </div>
  );
}
