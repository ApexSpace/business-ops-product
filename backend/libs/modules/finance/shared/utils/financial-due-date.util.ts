import { EstimateStatus, InvoiceStatus, Prisma } from '@prisma/client';

export function startOfTodayUtc(ref = new Date()): Date {
  const d = new Date(ref);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function toDateOnlyUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Calendar days from today until the target date (negative if in the past). */
export function daysUntilDate(target: Date, ref = new Date()): number {
  const targetDay = toDateOnlyUtc(target).getTime();
  const refDay = startOfTodayUtc(ref).getTime();
  return Math.round((targetDay - refDay) / (24 * 60 * 60 * 1000));
}

export function isPastDueDate(dueDate: Date, ref = new Date()): boolean {
  return daysUntilDate(dueDate, ref) < 0;
}

function toDecimal(
  value: Prisma.Decimal | string | number,
): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(value);
}

export function isInvoiceOverdue(params: {
  status: InvoiceStatus;
  dueDate: Date | null;
  balanceDue: Prisma.Decimal | string | number;
}): boolean {
  if (!params.dueDate) {
    return false;
  }

  const balanceDue = toDecimal(params.balanceDue);
  if (balanceDue.lessThanOrEqualTo(0)) {
    return false;
  }

  if (
    params.status === InvoiceStatus.VOID ||
    params.status === InvoiceStatus.PAID ||
    params.status === InvoiceStatus.DRAFT
  ) {
    return false;
  }

  if (params.status === InvoiceStatus.OVERDUE) {
    return true;
  }

  return (
    (params.status === InvoiceStatus.SENT ||
      params.status === InvoiceStatus.PARTIAL) &&
    isPastDueDate(params.dueDate)
  );
}

export function resolveInvoiceDisplayStatus(
  status: InvoiceStatus,
  dueDate: Date | null,
  balanceDue: Prisma.Decimal,
): InvoiceStatus {
  if (isInvoiceOverdue({ status, dueDate, balanceDue })) {
    return InvoiceStatus.OVERDUE;
  }
  return status;
}

export function isEstimateExpired(params: {
  status: EstimateStatus;
  expiryDate: Date | null;
}): boolean {
  if (!params.expiryDate) {
    return false;
  }

  if (params.status === EstimateStatus.EXPIRED) {
    return true;
  }

  return (
    params.status === EstimateStatus.SENT &&
    isPastDueDate(params.expiryDate)
  );
}

export function resolveEstimateDisplayStatus(
  status: EstimateStatus,
  expiryDate: Date | null,
): EstimateStatus {
  if (isEstimateExpired({ status, expiryDate })) {
    return EstimateStatus.EXPIRED;
  }
  return status;
}
