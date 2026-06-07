import type { EstimateStatus } from "@/features/estimates/types";
import type { InvoiceStatus } from "@/features/invoices/types";

export function startOfTodayLocal(ref = new Date()): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateOnlyLocal(date: string | Date): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Calendar days from today until the target date (negative if in the past). */
export function daysUntilDate(
  target: string | Date,
  ref = new Date(),
): number {
  const targetDay = toDateOnlyLocal(target).getTime();
  const refDay = startOfTodayLocal(ref).getTime();
  return Math.round((targetDay - refDay) / (24 * 60 * 60 * 1000));
}

export function isPastDueDate(
  dueDate: string | Date,
  ref = new Date(),
): boolean {
  return daysUntilDate(dueDate, ref) < 0;
}

function parseBalanceDue(balanceDue: string): number {
  const value = parseFloat(balanceDue);
  return Number.isNaN(value) ? 0 : value;
}

export function isInvoiceOverdue(invoice: {
  status: InvoiceStatus | string;
  dueDate: string | null;
  balanceDue: string;
}): boolean {
  if (!invoice.dueDate) return false;
  if (parseBalanceDue(invoice.balanceDue) <= 0) return false;

  const status = invoice.status;
  if (status === "VOID" || status === "PAID" || status === "DRAFT") {
    return false;
  }
  if (status === "OVERDUE") return true;

  return (
    (status === "SENT" || status === "PARTIAL") &&
    isPastDueDate(invoice.dueDate)
  );
}

export function resolveInvoiceDisplayStatus(
  status: InvoiceStatus | string,
  dueDate: string | null,
  balanceDue: string,
): InvoiceStatus | string {
  if (isInvoiceOverdue({ status, dueDate, balanceDue })) {
    return "OVERDUE";
  }
  return status;
}

export function isEstimateExpired(estimate: {
  status: EstimateStatus | string;
  expiryDate: string | null;
}): boolean {
  if (!estimate.expiryDate) return false;
  if (estimate.status === "EXPIRED") return true;

  return (
    estimate.status === "SENT" && isPastDueDate(estimate.expiryDate)
  );
}

export function resolveEstimateDisplayStatus(
  status: EstimateStatus | string,
  expiryDate: string | null,
): EstimateStatus | string {
  if (isEstimateExpired({ status, expiryDate })) {
    return "EXPIRED";
  }
  return status;
}

export type DueCountdownTone = "muted" | "warning";

export interface DueCountdown {
  label: string;
  tone: DueCountdownTone;
}

function formatDueInDays(days: number): string {
  if (days === 0) return "Due today";
  if (days === 1) return "Due in 1 day";
  return `Due in ${days} days`;
}

function formatExpiresInDays(days: number): string {
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires in 1 day";
  return `Expires in ${days} days`;
}

export function getInvoiceDueCountdown(invoice: {
  status: InvoiceStatus | string;
  dueDate: string | null;
  balanceDue: string;
}): DueCountdown | null {
  if (!invoice.dueDate) return null;

  const status = invoice.status;
  if (status !== "SENT" && status !== "PARTIAL" && status !== "OVERDUE") {
    return null;
  }

  if (parseBalanceDue(invoice.balanceDue) <= 0) return null;

  const days = daysUntilDate(invoice.dueDate);
  if (days < 0) return null;

  return {
    label: formatDueInDays(days),
    tone: days <= 3 ? "warning" : "muted",
  };
}

export function getEstimateExpiryCountdown(estimate: {
  status: EstimateStatus | string;
  expiryDate: string | null;
}): DueCountdown | null {
  if (!estimate.expiryDate) return null;
  if (estimate.status !== "SENT" && estimate.status !== "EXPIRED") {
    return null;
  }

  const days = daysUntilDate(estimate.expiryDate);
  if (days < 0) return null;

  return {
    label: formatExpiresInDays(days),
    tone: days <= 3 ? "warning" : "muted",
  };
}

export function resolveInvoiceStatusForDisplay(invoice: {
  status: InvoiceStatus | string;
  dueDate: string | null;
  balanceDue: string;
}): InvoiceStatus | string {
  return resolveInvoiceDisplayStatus(
    invoice.status,
    invoice.dueDate,
    invoice.balanceDue,
  );
}

export function resolveEstimateStatusForDisplay(estimate: {
  status: EstimateStatus | string;
  expiryDate: string | null;
}): EstimateStatus | string {
  return resolveEstimateDisplayStatus(
    estimate.status,
    estimate.expiryDate,
  );
}
