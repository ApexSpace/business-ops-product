import { Injectable } from '@nestjs/common';
import {
  InvoiceKind,
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { generateInvoicePublicToken } from '../utils/invoice-public-token.util';

export const checkoutInclude = {
  contact: {
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      companyName: true,
      email: true,
      phoneCountryCode: true,
      phoneNumber: true,
    },
  },
  closedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  items: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    include: {
      service: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, variantKey: true } },
      staffUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
} satisfies Prisma.InvoiceInclude;

export type CheckoutWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof checkoutInclude;
}>;

export interface CheckoutItemInput {
  lineType: InvoiceLineType;
  serviceId?: string | null;
  productId?: string | null;
  variantId?: string | null;
  staffUserId?: string | null;
  title: string;
  description?: string | null;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  sortOrder?: number;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateCheckoutData {
  contactId: string;
  invoiceNumber: string;
  displaySequence: number;
  issueDate: Date;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  balanceDue: Prisma.Decimal;
  notes?: string | null;
  items: CheckoutItemInput[];
}

@Injectable()
export class CheckoutRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeCheckoutWhere(
    businessId: string,
    extra?: Prisma.InvoiceWhereInput,
  ): Prisma.InvoiceWhereInput {
    return {
      businessId,
      kind: InvoiceKind.CHECKOUT,
      deletedAt: null,
      ...extra,
    };
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<CheckoutWithRelations | null> {
    return this.prisma.invoice.findFirst({
      where: this.activeCheckoutWhere(businessId, { id }),
      include: checkoutInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      contactId?: string;
      status?: InvoiceStatus;
      issueFrom?: Date;
      issueTo?: Date;
    },
  ): Promise<{ items: CheckoutWithRelations[]; total: number }> {
    const where = this.activeCheckoutWhere(businessId, {
      ...(params.contactId ? { contactId: params.contactId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.issueFrom || params.issueTo
        ? {
            issueDate: {
              ...(params.issueFrom ? { gte: params.issueFrom } : {}),
              ...(params.issueTo ? { lte: params.issueTo } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              {
                invoiceNumber: { contains: params.search, mode: 'insensitive' },
              },
              {
                contact: {
                  OR: [
                    {
                      firstName: {
                        contains: params.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      lastName: {
                        contains: params.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      displayName: {
                        contains: params.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    });

    return Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        include: checkoutInclude,
      }),
      this.prisma.invoice.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: CreateCheckoutData,
    createdById: string,
  ): Promise<CheckoutWithRelations> {
    return this.prisma.invoice.create({
      data: {
        business: { connect: { id: businessId } },
        contact: { connect: { id: data.contactId } },
        kind: InvoiceKind.CHECKOUT,
        displaySequence: data.displaySequence,
        invoiceNumber: data.invoiceNumber,
        publicToken: generateInvoicePublicToken(),
        status: InvoiceStatus.OPEN,
        issueDate: data.issueDate,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        balanceDue: data.balanceDue,
        remainingAmount: data.balanceDue,
        notes: data.notes,
        createdBy: { connect: { id: createdById } },
        items: {
          create: data.items.map((item, index) => ({
            lineType: item.lineType,
            service: item.serviceId
              ? { connect: { id: item.serviceId } }
              : undefined,
            product: item.productId
              ? { connect: { id: item.productId } }
              : undefined,
            variant: item.variantId
              ? { connect: { id: item.variantId } }
              : undefined,
            staffUser: item.staffUserId
              ? { connect: { id: item.staffUserId } }
              : undefined,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            sortOrder: item.sortOrder ?? index,
            metadata: item.metadata,
          })),
        },
      },
      include: checkoutInclude,
    });
  }

  async replaceItems(
    checkoutId: string,
    items: CheckoutItemInput[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: checkoutId } });
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        await tx.invoiceItem.create({
          data: {
            invoiceId: checkoutId,
            lineType: item.lineType,
            serviceId: item.serviceId ?? null,
            productId: item.productId ?? null,
            variantId: item.variantId ?? null,
            staffUserId: item.staffUserId ?? null,
            title: item.title,
            description: item.description ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            sortOrder: item.sortOrder ?? index,
            metadata: item.metadata ?? undefined,
          },
        });
      }
    });
  }

  async deleteItem(checkoutId: string, lineId: string): Promise<boolean> {
    const result = await this.prisma.invoiceItem.deleteMany({
      where: { id: lineId, invoiceId: checkoutId },
    });
    return result.count > 0;
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.InvoiceUpdateInput,
  ): Promise<CheckoutWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) return null;
    return this.prisma.invoice.update({
      where: { id },
      data,
      include: checkoutInclude,
    });
  }
}
