import {
  InvoiceKind,
  InvoicePaymentStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { deriveInvoicePaymentStatus } from './invoice-payment-status.util';

export function sumPaymentAmounts(
  payments: { amount: Prisma.Decimal }[],
): Prisma.Decimal {
  return payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
}

export function computeBalanceDue(
  totalAmount: Prisma.Decimal,
  totalPaid: Prisma.Decimal,
): Prisma.Decimal {
  const balance = totalAmount.sub(totalPaid);
  return balance.lessThan(0) ? new Prisma.Decimal(0) : balance;
}

export type InvoiceStatusFromPaymentsOptions = {
  /** When set, a $0 unpaid sale was explicitly closed (e.g. membership-covered). */
  closedAt?: Date | null;
  kind?: InvoiceKind | null;
};

/**
 * Derive invoice status from payment totals (operational tracking, not accounting).
 *
 * Important: balanceDue === 0 with no payments must NOT imply PAID for open
 * checkouts. New/empty POS sales are $0 until line items are added; marking
 * them PAID on sync auto-closes every sale as soon as it is opened.
 */
export function invoiceStatusFromPayments(
  currentStatus: InvoiceStatus,
  totalAmount: Prisma.Decimal,
  totalPaid: Prisma.Decimal,
  options: InvoiceStatusFromPaymentsOptions = {},
): InvoiceStatus {
  if (currentStatus === InvoiceStatus.VOID) {
    return InvoiceStatus.VOID;
  }

  // Self-heal checkout rows wrongly flipped to PAID by older sync logic
  // (no payments collected and never explicitly closed). Treat as OPEN for
  // the rest of status derivation so list/detail stay consistent.
  let status = currentStatus;
  if (
    options.kind === InvoiceKind.CHECKOUT &&
    status === InvoiceStatus.PAID &&
    totalPaid.lessThanOrEqualTo(0) &&
    !options.closedAt
  ) {
    status = InvoiceStatus.OPEN;
  }

  const balanceDue = computeBalanceDue(totalAmount, totalPaid);

  if (balanceDue.lessThanOrEqualTo(0)) {
    if (totalPaid.greaterThan(0)) {
      return InvoiceStatus.PAID;
    }

    // Explicitly closed $0 sale (membership / 100% discount close flow).
    if (options.closedAt) {
      return InvoiceStatus.PAID;
    }

    // Unpaid open checkouts stay open (empty sale or unpaid $0 total).
    if (status === InvoiceStatus.OPEN) {
      return InvoiceStatus.OPEN;
    }

    // DRAFT/SENT/etc. $0 invoices still resolve to PAID when nothing is owed.
    return InvoiceStatus.PAID;
  }

  if (totalPaid.greaterThan(0)) {
    if (
      status === InvoiceStatus.DRAFT ||
      status === InvoiceStatus.SENT ||
      status === InvoiceStatus.PARTIAL ||
      status === InvoiceStatus.PAID ||
      status === InvoiceStatus.OVERDUE
    ) {
      return InvoiceStatus.PARTIAL;
    }
    return status;
  }

  if (status === InvoiceStatus.PARTIAL || status === InvoiceStatus.PAID) {
    return InvoiceStatus.SENT;
  }

  return status;
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
    closedAt?: Date | null;
    kind?: InvoiceKind | null;
  },
  payments: { amount: Prisma.Decimal; paidAt: Date }[],
): InvoicePaymentSyncFields {
  const totalPaid = sumPaymentAmounts(payments);
  const balanceDue = computeBalanceDue(invoice.totalAmount, totalPaid);
  const status = invoiceStatusFromPayments(
    invoice.status,
    invoice.totalAmount,
    totalPaid,
    { closedAt: invoice.closedAt, kind: invoice.kind },
  );
  const paymentStatus = deriveInvoicePaymentStatus(
    invoice.totalAmount,
    totalPaid,
    status,
  );
  const lastPaymentAt =
    payments.length > 0
      ? payments.reduce(
          (latest, p) => (p.paidAt > latest ? p.paidAt : latest),
          payments[0].paidAt,
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
