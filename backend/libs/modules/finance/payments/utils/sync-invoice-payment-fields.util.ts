import { InvoiceStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@app/core/database/prisma.service';
import { computeInvoicePaymentSyncFields } from './invoice-payment-sync.util';

export async function syncInvoicePaymentFields(
  prisma: PrismaService,
  businessId: string,
  invoiceId: string,
): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId, deletedAt: null },
  });
  if (!invoice) return;

  const payments = await prisma.payment.findMany({
    where: {
      businessId,
      invoiceId,
      deletedAt: null,
      status: 'SUCCEEDED',
      paidAt: { not: null },
    },
    select: { amount: true, paidAt: true },
  });

  const fields = computeInvoicePaymentSyncFields(
    invoice,
    payments.map((payment) => ({
      amount: payment.amount,
      paidAt: payment.paidAt!,
    })),
  );

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: fields,
  });
}

export async function loadInvoicePaymentFields(
  prisma: PrismaService,
  businessId: string,
  invoiceId: string,
  totalAmount: Prisma.Decimal,
  currentStatus: InvoiceStatus,
) {
  const payments = await prisma.payment.findMany({
    where: {
      businessId,
      invoiceId,
      deletedAt: null,
      status: 'SUCCEEDED',
      paidAt: { not: null },
    },
    select: { amount: true, paidAt: true },
  });

  return computeInvoicePaymentSyncFields(
    { status: currentStatus, totalAmount },
    payments.map((payment) => ({
      amount: payment.amount,
      paidAt: payment.paidAt!,
    })),
  );
}
