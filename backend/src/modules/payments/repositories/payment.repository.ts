import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

const paymentInclude = {
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
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      balanceDue: true,
      status: true,
    },
  },
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} satisfies Prisma.PaymentInclude;

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: typeof paymentInclude;
}>;

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.PaymentWhereInput,
  ): Prisma.PaymentWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  private searchWhere(search: string): Prisma.PaymentWhereInput {
    return {
      OR: [
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        {
          contact: {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ],
    };
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<PaymentWithRelations | null> {
    return this.prisma.payment.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: paymentInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      invoiceId?: string;
      contactId?: string;
      method?: PaymentMethod;
      paidFrom?: Date;
      paidTo?: Date;
    },
  ): Promise<{ items: PaymentWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.invoiceId ? { invoiceId: params.invoiceId } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
      ...(params.method ? { method: params.method } : {}),
      ...(params.paidFrom || params.paidTo
        ? {
            paidAt: {
              ...(params.paidFrom ? { gte: params.paidFrom } : {}),
              ...(params.paidTo ? { lte: params.paidTo } : {}),
            },
          }
        : {}),
      ...(params.search ? this.searchWhere(params.search) : {}),
    });

    return Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { paidAt: 'desc' },
        include: paymentInclude,
      }),
      this.prisma.payment.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findActiveByInvoiceId(
    businessId: string,
    invoiceId: string,
    excludePaymentId?: string,
  ): Promise<{ id: string; amount: Prisma.Decimal }[]> {
    return this.prisma.payment.findMany({
      where: this.activeWhere(businessId, {
        invoiceId,
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      }),
      select: { id: true, amount: true },
    });
  }

  create(
    businessId: string,
    data: {
      invoiceId: string;
      contactId: string;
      amount: Prisma.Decimal;
      method: PaymentMethod;
      reference?: string | null;
      notes?: string | null;
      paidAt: Date;
    },
    createdById: string,
  ): Promise<PaymentWithRelations> {
    return this.prisma.payment.create({
      data: {
        business: { connect: { id: businessId } },
        invoice: { connect: { id: data.invoiceId } },
        contact: { connect: { id: data.contactId } },
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        paidAt: data.paidAt,
        createdBy: { connect: { id: createdById } },
      },
      include: paymentInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.PaymentUpdateInput,
  ): Promise<PaymentWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.payment.update({
      where: { id },
      data,
      include: paymentInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return false;
    }
    await this.prisma.payment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
