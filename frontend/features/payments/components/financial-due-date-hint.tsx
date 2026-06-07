"use client";

import type { EstimateStatus } from "@/features/estimates/types";
import type { InvoiceStatus } from "@/features/invoices/types";
import {
  getEstimateExpiryCountdown,
  getInvoiceDueCountdown,
  resolveEstimateStatusForDisplay,
  resolveInvoiceStatusForDisplay,
} from "@/features/payments/utils/financial-due-date";
import { cn } from "@/lib/utils";

interface InvoiceDueDateHintProps {
  status: InvoiceStatus | string;
  dueDate: string | null | undefined;
  balanceDue: string;
  className?: string;
}

interface EstimateExpiryHintProps {
  status: EstimateStatus | string;
  expiryDate: string | null | undefined;
  className?: string;
}

function HintText({
  label,
  tone,
  className,
}: {
  label: string;
  tone: "muted" | "warning" | "danger";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs tabular-nums",
        tone === "danger" && "font-medium text-destructive",
        tone === "warning" &&
          "font-medium text-amber-800 dark:text-amber-300",
        tone === "muted" && "text-muted-foreground",
        className,
      )}
    >
      {label}
    </p>
  );
}

export function InvoiceDueDateHint({
  status,
  dueDate,
  balanceDue,
  className,
}: InvoiceDueDateHintProps) {
  if (!dueDate) return null;
  if (status !== "SENT" && status !== "PARTIAL" && status !== "OVERDUE") {
    return null;
  }

  const displayStatus = resolveInvoiceStatusForDisplay({
    status,
    dueDate,
    balanceDue,
  });

  if (displayStatus === "OVERDUE") {
    return (
      <HintText label="Overdue" tone="danger" className={className} />
    );
  }

  const countdown = getInvoiceDueCountdown({ status, dueDate, balanceDue });
  if (!countdown) return null;

  return (
    <HintText
      label={countdown.label}
      tone={countdown.tone}
      className={className}
    />
  );
}

export function EstimateExpiryHint({
  status,
  expiryDate,
  className,
}: EstimateExpiryHintProps) {
  if (!expiryDate) return null;
  if (status !== "SENT" && status !== "EXPIRED") return null;

  const displayStatus = resolveEstimateStatusForDisplay({
    status,
    expiryDate,
  });

  if (displayStatus === "EXPIRED") {
    return (
      <HintText label="Expired" tone="danger" className={className} />
    );
  }

  const countdown = getEstimateExpiryCountdown({ status, expiryDate });
  if (!countdown) return null;

  return (
    <HintText
      label={countdown.label}
      tone={countdown.tone}
      className={className}
    />
  );
}
