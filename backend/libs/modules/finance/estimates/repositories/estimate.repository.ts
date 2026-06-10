import { Injectable } from '@nestjs/common';
import { EstimateStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  formatEstimateNumber,
  parseEstimateSequence,
} from '../utils/estimate-calculations.util';

const estimateInclude = {
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
} satisfies Prisma.EstimateInclude;

export type EstimateWithRelations = Prisma.EstimateGetPayload<{
  include: typeof estimateInclude;
}>;

export interface CreateEstimateData {
  contactId: string;
  workItemId?: string | null;
  estimateNumber: string;
  status?: EstimateStatus;
  issueDate: Date;
  expiryDate?: Date | null;
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  notes?: string | null;
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
export class EstimateRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.EstimateWhereInput,
  ): Prisma.EstimateWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  private searchWhere(search: string): Prisma.EstimateWhereInput {
    return {
      OR: [
        { estimateNumber: { contains: search, mode: 'insensitive' } },
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

  async getNextEstimateNumber(businessId: string): Promise<string> {
    const latest = await this.prisma.estimate.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      select: { estimateNumber: true },
    });
    const seq = latest ? parseEstimateSequence(latest.estimateNumber) + 1 : 1;
    return formatEstimateNumber(seq);
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<EstimateWithRelations | null> {
    return this.prisma.estimate.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: estimateInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      contactId?: string;
      status?: EstimateStatus;
      issueFrom?: Date;
      issueTo?: Date;
    },
  ): Promise<{ items: EstimateWithRelations[]; total: number }> {
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
      this.prisma.estimate.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        include: estimateInclude,
      }),
      this.prisma.estimate.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: CreateEstimateData,
    createdById: string,
  ): Promise<EstimateWithRelations> {
    return this.prisma.estimate.create({
      data: {
        business: { connect: { id: businessId } },
        contact: { connect: { id: data.contactId } },
        workItem: data.workItemId
          ? { connect: { id: data.workItemId } }
          : undefined,
        estimateNumber: data.estimateNumber,
        status: data.status,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        notes: data.notes,
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
      include: estimateInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.EstimateUpdateInput,
    items?: CreateEstimateData['items'],
  ): Promise<EstimateWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }

    if (items) {
      await this.prisma.estimateItem.deleteMany({ where: { estimateId: id } });
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

    return this.prisma.estimate.update({
      where: { id },
      data,
      include: estimateInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return false;
    }
    await this.prisma.estimate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
