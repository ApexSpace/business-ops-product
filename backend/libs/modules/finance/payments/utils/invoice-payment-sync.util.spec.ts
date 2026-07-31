import { InvoiceKind, InvoiceStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { computeInvoicePaymentSyncFields } from './invoice-payment-sync.util';

describe('computeInvoicePaymentSyncFields for checkout sales', () => {
  it('marks an open checkout as paid when wallet payments cover the total', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal('50.00'),
        kind: InvoiceKind.CHECKOUT,
      },
      [{ amount: new Prisma.Decimal('50.00'), paidAt: new Date('2026-07-20T12:00:00.000Z') }],
    );

    expect(fields.balanceDue.toFixed(2)).toBe('0.00');
    expect(fields.status).toBe(InvoiceStatus.PAID);
    expect(fields.paidAmount.toFixed(2)).toBe('50.00');
  });

  it('keeps a checkout open when only part of the total is paid', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal('50.00'),
        kind: InvoiceKind.CHECKOUT,
      },
      [{ amount: new Prisma.Decimal('20.00'), paidAt: new Date('2026-07-20T12:00:00.000Z') }],
    );

    expect(fields.balanceDue.toFixed(2)).toBe('30.00');
    expect(fields.status).toBe(InvoiceStatus.OPEN);
  });

  it('keeps an empty unpaid checkout open (does not treat $0 balance as paid)', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal('0'),
        kind: InvoiceKind.CHECKOUT,
      },
      [],
    );

    expect(fields.balanceDue.toFixed(2)).toBe('0.00');
    expect(fields.paidAmount.toFixed(2)).toBe('0.00');
    expect(fields.status).toBe(InvoiceStatus.OPEN);
  });

  it('keeps an unpaid $0 checkout open when lines are fully covered (no close yet)', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal('0'),
        kind: InvoiceKind.CHECKOUT,
        closedAt: null,
      },
      [],
    );

    expect(fields.status).toBe(InvoiceStatus.OPEN);
  });

  it('keeps an explicitly closed $0 checkout as paid', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.PAID,
        totalAmount: new Prisma.Decimal('0'),
        kind: InvoiceKind.CHECKOUT,
        closedAt: new Date('2026-07-31T12:00:00.000Z'),
      },
      [],
    );

    expect(fields.status).toBe(InvoiceStatus.PAID);
  });

  it('self-heals a checkout wrongly marked paid with no payments and no close', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.PAID,
        totalAmount: new Prisma.Decimal('0'),
        kind: InvoiceKind.CHECKOUT,
        closedAt: null,
      },
      [],
    );

    expect(fields.status).toBe(InvoiceStatus.OPEN);
  });

  it('self-heals a wrongly paid checkout that later gained unpaid line items', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.PAID,
        totalAmount: new Prisma.Decimal('50.00'),
        kind: InvoiceKind.CHECKOUT,
        closedAt: null,
      },
      [],
    );

    expect(fields.status).toBe(InvoiceStatus.OPEN);
    expect(fields.balanceDue.toFixed(2)).toBe('50.00');
  });
});
