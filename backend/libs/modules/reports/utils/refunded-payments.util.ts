import { PaymentStatus, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { moneyNumber } from './report-date-range.util';

export function parsePaymentMeta(
  metadata: unknown,
): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

/**
 * Refunds in this system are often marked via metadata.refundedAt / stripeRefundId
 * without flipping Payment.status to REFUNDED. Match all three signals.
 */
export function isRefundedPayment(payment: {
  status: PaymentStatus;
  stripeRefundId: string | null;
  providerMetadata: unknown;
}): boolean {
  if (payment.status === PaymentStatus.REFUNDED) return true;
  if (payment.stripeRefundId) return true;
  return typeof parsePaymentMeta(payment.providerMetadata).refundedAt === 'string';
}

/** Prefer metadata.refundedAt; fall back to updatedAt. */
export function refundTimestamp(payment: {
  updatedAt: Date;
  providerMetadata: unknown;
}): Date {
  const meta = parsePaymentMeta(payment.providerMetadata);
  if (typeof meta.refundedAt === 'string') {
    const parsed = DateTime.fromISO(meta.refundedAt);
    if (parsed.isValid) return parsed.toJSDate();
  }
  return payment.updatedAt;
}

export function refundAmountValue(payment: {
  amount: unknown;
  providerMetadata: unknown;
}): number {
  const meta = parsePaymentMeta(payment.providerMetadata);
  if (meta.amountRefunded != null) {
    return moneyNumber(meta.amountRefunded);
  }
  return moneyNumber(payment.amount);
}

/**
 * Prisma where for payments that look refunded.
 * When `range` is provided, matches refund activity in that window
 * (status/stripe via updatedAt, metadata via refundedAt ISO strings).
 */
export function refundedPaymentWhere(
  businessId: string,
  range?: { start: Date; end: Date },
): Prisma.PaymentWhereInput {
  const base: Prisma.PaymentWhereInput = {
    businessId,
    deletedAt: null,
  };

  if (!range) {
    return {
      ...base,
      OR: [
        { status: PaymentStatus.REFUNDED },
        { stripeRefundId: { not: null } },
        {
          providerMetadata: {
            path: ['refundedAt'],
            string_starts_with: '2',
          },
        },
      ],
    };
  }

  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  return {
    ...base,
    OR: [
      {
        status: PaymentStatus.REFUNDED,
        updatedAt: { gte: range.start, lte: range.end },
      },
      {
        stripeRefundId: { not: null },
        updatedAt: { gte: range.start, lte: range.end },
      },
      {
        AND: [
          {
            providerMetadata: {
              path: ['refundedAt'],
              gte: startIso,
            },
          },
          {
            providerMetadata: {
              path: ['refundedAt'],
              lte: endIso,
            },
          },
        ],
      },
    ],
  };
}
