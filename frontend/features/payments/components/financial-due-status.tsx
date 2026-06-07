import { StatusBadge } from "@/components/data-display/status-badge";
import type { EstimateStatus } from "@/features/estimates/types";
import type { InvoiceStatus as InvoiceStatusType } from "@/features/invoices/types";
import {
  getEstimateExpiryCountdown,
  getInvoiceDueCountdown,
  resolveEstimateStatusForDisplay,
  resolveInvoiceStatusForDisplay,
  type DueCountdown,
} from "@/features/payments/utils/financial-due-date";
import { cn } from "@/lib/utils";

interface InvoiceDueStatusProps {
  invoice: {
    status: InvoiceStatusType;
    dueDate: string | null;
    balanceDue: string;
  };
  className?: string;
}

interface EstimateDueStatusProps {
  estimate: {
    status: EstimateStatus;
    expiryDate: string | null;
  };
  className?: string;
}

function DueCountdownText({
  countdown,
}: {
  countdown: DueCountdown | null;
}) {
  if (!countdown) return null;

  return (
    <span
      className={cn(
        "text-[11px] tabular-nums leading-tight",
        countdown.tone === "warning"
          ? "font-medium text-amber-800 dark:text-amber-300"
          : "text-muted-foreground",
      )}
    >
      {countdown.label}
    </span>
  );
}

export function InvoiceDueStatus({ invoice, className }: InvoiceDueStatusProps) {
  const displayStatus = resolveInvoiceStatusForDisplay(invoice);
  const countdown =
    displayStatus === "OVERDUE" ? null : getInvoiceDueCountdown(invoice);

  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <StatusBadge status={displayStatus} domain="invoice" />
      <DueCountdownText countdown={countdown} />
    </div>
  );
}

export function EstimateDueStatus({
  estimate,
  className,
}: EstimateDueStatusProps) {
  const displayStatus = resolveEstimateStatusForDisplay(estimate);
  const countdown =
    displayStatus === "EXPIRED"
      ? null
      : getEstimateExpiryCountdown(estimate);

  return (
    <div
      className={cn(
        "flex flex-row flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <StatusBadge status={displayStatus} domain="estimate" />
      <DueCountdownText countdown={countdown} />
    </div>
  );
}
