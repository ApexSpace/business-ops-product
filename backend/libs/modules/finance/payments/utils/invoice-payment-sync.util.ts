import {
  InvoicePaymentStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { deriveInvoicePaymentStatus } from './invoice-payment-status.util';

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

export type InvoicePaymentSyncFields = {
  balanceDue: Prisma.Decimal;
  status: InvoiceStatus;
  paymentStatus: InvoicePaymentStatus;
  paidAmount: Prisma.Decimal;
  remainingAmount: Prisma.Decimal;
  lastPaymentAt: Date | null;
};

export function computeInvoicePaymentSyncFields(
  invoice: {
    status: InvoiceStatus;
    totalAmount: Prisma.Decimal;
  },
  payments: { amount: Prisma.Decimal; paidAt: Date }[],
): InvoicePaymentSyncFields {
  const totalPaid = sumPaymentAmounts(payments);
  const balanceDue = computeBalanceDue(invoice.totalAmount, totalPaid);
  const status = invoiceStatusFromPayments(
    invoice.status,
    invoice.totalAmount,
    totalPaid,
  );
  const paymentStatus = deriveInvoicePaymentStatus(
    invoice.totalAmount,
    totalPaid,
    invoice.status,
  );
  const lastPaymentAt =
    payments.length > 0
      ? payments.reduce(
          (latest, p) => (p.paidAt > latest ? p.paidAt : latest),
          payments[0]!.paidAt,
        )
      : null;

  return {
    balanceDue,
    status,
    paymentStatus,
    paidAmount: totalPaid,
    remainingAmount: balanceDue,
    lastPaymentAt,
  };
}
