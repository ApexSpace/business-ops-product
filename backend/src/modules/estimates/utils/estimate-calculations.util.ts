import { Prisma } from '@prisma/client';

export interface EstimateLineInput {
  quantity: number;
  unitPrice: number;
}

export interface EstimateTotalsInput {
  items: EstimateLineInput[];
  taxAmount?: number;
  discountAmount?: number;
}

export interface EstimateTotalsResult {
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  lineTotals: Prisma.Decimal[];
}

function toMoney(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function lineTotal(quantity: number, unitPrice: number): Prisma.Decimal {
  return toMoney(quantity * unitPrice);
}

export function calculateEstimateTotals(
  input: EstimateTotalsInput,
): EstimateTotalsResult {
  const lineTotals = input.items.map((item) =>
    lineTotal(item.quantity, item.unitPrice),
  );

  const subtotal = lineTotals.reduce(
    (sum, line) => sum.add(line),
    new Prisma.Decimal(0),
  );

  const taxAmount = toMoney(input.taxAmount ?? 0);
  const discountAmount = toMoney(input.discountAmount ?? 0);
  const totalAmount = subtotal.add(taxAmount).sub(discountAmount);

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount: totalAmount.lessThan(0) ? new Prisma.Decimal(0) : totalAmount,
    lineTotals,
  };
}

export function formatEstimateNumber(sequence: number): string {
  return `EST-${String(sequence).padStart(4, '0')}`;
}

export function parseEstimateSequence(estimateNumber: string): number {
  const match = /^EST-(\d+)$/i.exec(estimateNumber.trim());
  if (!match) {
    return 0;
  }
  return parseInt(match[1], 10);
}
