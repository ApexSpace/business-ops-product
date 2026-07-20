import {
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import type { PrismaService } from '@app/core/database/prisma.service';

/** Shared closed-sale invoice filter used by sales/staff report providers. */
export function closedInvoiceWhere(
  businessId: string,
  start: Date,
  end: Date,
): Prisma.InvoiceWhereInput {
  return {
    businessId,
    deletedAt: null,
    OR: [
      { closedAt: { gte: start, lte: end } },
      {
        closedAt: null,
        status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] },
        issueDate: { gte: start, lte: end },
      },
    ],
  };
}

export const invoiceItemsInclude = {
  items: {
    select: {
      id: true,
      lineType: true,
      title: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      metadata: true,
      staffUserId: true,
      serviceId: true,
      productId: true,
      service: {
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          categoryId: true,
          category: { select: { name: true } },
          purchaseCost: true,
          unitPrice: true,
        },
      },
      variant: {
        select: {
          id: true,
          purchaseCost: true,
          price: true,
        },
      },
      staffUser: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.InvoiceInclude;

export async function loadClosedInvoicesWithItems(
  prisma: PrismaService,
  businessId: string,
  start: Date,
  end: Date,
) {
  return prisma.invoice.findMany({
    where: closedInvoiceWhere(businessId, start, end),
    select: {
      id: true,
      invoiceNumber: true,
      closedAt: true,
      issueDate: true,
      contactId: true,
      ...invoiceItemsInclude,
    },
  });
}

export function isServiceOrProduct(lineType: InvoiceLineType): boolean {
  return (
    lineType === InvoiceLineType.SERVICE ||
    lineType === InvoiceLineType.PRODUCT
  );
}

export function staffDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
} | null): string {
  if (!user) return 'Unassigned';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Staff';
}
