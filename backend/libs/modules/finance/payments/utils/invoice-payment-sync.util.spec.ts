import { InvoiceStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { computeInvoicePaymentSyncFields } from './invoice-payment-sync.util';

describe('computeInvoicePaymentSyncFields for checkout sales', () => {
  it('marks an open checkout as paid when wallet payments cover the total', () => {
    const fields = computeInvoicePaymentSyncFields(
      {
        status: InvoiceStatus.OPEN,
        totalAmount: new Prisma.Decimal('50.00'),
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
      },
      [{ amount: new Prisma.Decimal('20.00'), paidAt: new Date('2026-07-20T12:00:00.000Z') }],
    );

    expect(fields.balanceDue.toFixed(2)).toBe('30.00');
    expect(fields.status).toBe(InvoiceStatus.OPEN);
  });
});
