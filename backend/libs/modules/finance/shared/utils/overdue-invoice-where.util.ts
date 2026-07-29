import { InvoiceStatus, Prisma } from '@prisma/client';

export function buildOverdueInvoiceWhere(
  businessId: string,
  startOfToday: Date,
): Prisma.InvoiceWhereInput {
  return {
    businessId,
    deletedAt: null,
    balanceDue: { gt: 0 },
    status: { not: InvoiceStatus.VOID },
    OR: [{ status: InvoiceStatus.OVERDUE }, { dueDate: { lt: startOfToday } }],
  };
}
