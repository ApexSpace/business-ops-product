import { InvoicePaymentStatus, InvoiceStatus, Prisma } from '@prisma/client';
import { computeBalanceDue } from './invoice-payment-sync.util';

export function deriveInvoicePaymentStatus(
  totalAmount: Prisma.Decimal,
  totalPaid: Prisma.Decimal,
  invoiceStatus: InvoiceStatus,
): InvoicePaymentStatus {
  if (invoiceStatus === InvoiceStatus.VOID) {
    return InvoicePaymentStatus.UNPAID;
  }

  const balanceDue = computeBalanceDue(totalAmount, totalPaid);

  if (totalPaid.greaterThan(totalAmount)) {
    return InvoicePaymentStatus.OVERPAID;
  }

  if (balanceDue.lessThanOrEqualTo(0) && totalPaid.greaterThan(0)) {
    return InvoicePaymentStatus.PAID;
  }

  if (totalPaid.greaterThan(0) && balanceDue.greaterThan(0)) {
    return InvoicePaymentStatus.PARTIALLY_PAID;
  }

  return InvoicePaymentStatus.UNPAID;
}
