import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  formatInvoiceNumber,
  parseInvoiceSequence,
} from '../utils/invoice-calculations.util';

const invoiceInclude = {
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
  estimate: {
    select: { id: true, estimateNumber: true },
  },
  workItem: {
    select: { id: true, title: true },
  },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      service: {
        select: { id: true, name: true },
      },
    },
  },
} satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof invoiceInclude;
}>;

export interface CreateInvoiceData {
  contactId: string;
  estimateId?: string | null;
  workItemId?: string | null;
  invoiceNumber: string;
  status?: InvoiceStatus;
  issueDate: Date;
  dueDate?: Date | null;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  balanceDue: Prisma.Decimal;
  notes?: string | null;
  paymentTerms?: string | null;
  termsAndConditions?: string | null;
  items: {
    serviceId?: string | null;
    title: string;
    description?: string | null;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
    totalPrice: Prisma.Decimal;
  }[];
}

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.InvoiceWhereInput,
  ): Prisma.InvoiceWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  private searchWhere(search: string): Prisma.InvoiceWhereInput {
    return {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ],
    };
  }

  async getNextInvoiceNumber(businessId: string): Promise<string> {
    const latest = await this.prisma.invoice.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });
    const seq = latest ? parseInvoiceSequence(latest.invoiceNumber) + 1 : 1;
    return formatInvoiceNumber(seq);
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<InvoiceWithRelations | null> {
    return this.prisma.invoice.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: invoiceInclude,
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
  ): Promise<{ items: InvoiceWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
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
      ...(params.search ? this.searchWhere(params.search) : {}),
    });

    return Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        include: invoiceInclude,
      }),
      this.prisma.invoice.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: CreateInvoiceData,
    createdById: string,
  ): Promise<InvoiceWithRelations> {
    return this.prisma.invoice.create({
      data: {
        business: { connect: { id: businessId } },
        contact: { connect: { id: data.contactId } },
        estimate: data.estimateId
          ? { connect: { id: data.estimateId } }
          : undefined,
        workItem: data.workItemId
          ? { connect: { id: data.workItemId } }
          : undefined,
        invoiceNumber: data.invoiceNumber,
        status: data.status,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        balanceDue: data.balanceDue,
        notes: data.notes,
        paymentTerms: data.paymentTerms,
        termsAndConditions: data.termsAndConditions,
        createdBy: { connect: { id: createdById } },
        items: {
          create: data.items.map((item) => ({
            service: item.serviceId
              ? { connect: { id: item.serviceId } }
              : undefined,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: invoiceInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.InvoiceUpdateInput,
    items?: CreateInvoiceData['items'],
  ): Promise<InvoiceWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }

    if (items) {
      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      data.items = {
        create: items.map((item) => ({
          service: item.serviceId
            ? { connect: { id: item.serviceId } }
            : undefined,
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };
    }

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: invoiceInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return false;
    }
    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
