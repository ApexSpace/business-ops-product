import { Prisma } from '@prisma/client';
import {
  calculateEstimateTotals,
  type EstimateLineInput,
  type EstimateTotalsInput,
} from '../../estimates/utils/estimate-calculations.util';

export type InvoiceLineInput = EstimateLineInput;
export type InvoiceTotalsInput = EstimateTotalsInput;

export function calculateInvoiceTotals(input: InvoiceTotalsInput) {
  return calculateEstimateTotals(input);
}

export function formatInvoiceNumber(sequence: number): string {
  return `INV-${String(sequence).padStart(4, '0')}`;
}

export function parseInvoiceSequence(invoiceNumber: string): number {
  const match = /^INV-(\d+)$/i.exec(invoiceNumber.trim());
  if (!match) {
    return 0;
  }
  return parseInt(match[1], 10);
}

/** Preserve amount paid when line totals change. */
export function recalculateBalanceDue(
  previousTotal: Prisma.Decimal,
  previousBalanceDue: Prisma.Decimal,
  newTotal: Prisma.Decimal,
): Prisma.Decimal {
  const paid = previousTotal.sub(previousBalanceDue);
  const balance = newTotal.sub(paid);
  return balance.lessThan(0) ? new Prisma.Decimal(0) : balance;
}

export function balanceDueForStatus(
  status: string,
  totalAmount: Prisma.Decimal,
): Prisma.Decimal {
  if (status === 'PAID' || status === 'VOID') {
    return new Prisma.Decimal(0);
  }
  return totalAmount;
}
