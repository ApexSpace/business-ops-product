import { InvoiceStatus, Prisma } from '@prisma/client';

export function sumPaymentAmounts(
  payments: { amount: Prisma.Decimal }[],
): Prisma.Decimal {
  return payments.reduce(
    (sum, p) => sum.add(p.amount),
    new Prisma.Decimal(0),
  );
}

export function computeBalanceDue(
  totalAmount: Prisma.Decimal,
  totalPaid: Prisma.Decimal,
): Prisma.Decimal {
  const balance = totalAmount.sub(totalPaid);
  return balance.lessThan(0) ? new Prisma.Decimal(0) : balance;
}

/** Derive invoice status from payment totals (operational tracking, not accounting). */
export function invoiceStatusFromPayments(
  currentStatus: InvoiceStatus,
  totalAmount: Prisma.Decimal,
  totalPaid: Prisma.Decimal,
): InvoiceStatus {
  if (currentStatus === InvoiceStatus.VOID) {
    return InvoiceStatus.VOID;
  }

  const balanceDue = computeBalanceDue(totalAmount, totalPaid);

  if (balanceDue.lessThanOrEqualTo(0)) {
    return InvoiceStatus.PAID;
  }

  if (totalPaid.greaterThan(0)) {
    if (
      currentStatus === InvoiceStatus.DRAFT ||
      currentStatus === InvoiceStatus.SENT ||
      currentStatus === InvoiceStatus.PARTIAL ||
      currentStatus === InvoiceStatus.PAID ||
      currentStatus === InvoiceStatus.OVERDUE
    ) {
      return InvoiceStatus.PARTIAL;
    }
    return currentStatus;
  }

  if (
    currentStatus === InvoiceStatus.PARTIAL ||
    currentStatus === InvoiceStatus.PAID
  ) {
    return InvoiceStatus.SENT;
  }

  return currentStatus;
}
