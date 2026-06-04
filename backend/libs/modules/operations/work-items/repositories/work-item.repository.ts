import { Injectable } from '@nestjs/common';
import { Prisma, WorkItemStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const workItemInclude = {
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
  service: {
    select: { id: true, name: true, category: true, price: true },
  },
  assignedTo: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} satisfies Prisma.WorkItemInclude;

export type WorkItemWithRelations = Prisma.WorkItemGetPayload<{
  include: typeof workItemInclude;
}>;

@Injectable()
export class WorkItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.WorkItemWhereInput,
  ): Prisma.WorkItemWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  private searchWhere(search: string): Prisma.WorkItemWhereInput {
    return {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } },
              { phoneCountryCode: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ],
    };
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<WorkItemWithRelations | null> {
    return this.prisma.workItem.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: workItemInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      status?: WorkItemStatus;
      serviceId?: string;
      contactId?: string;
      assignedToId?: string;
      scheduledFrom?: Date;
      scheduledTo?: Date;
    },
  ): Promise<{ items: WorkItemWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.status ? { status: params.status } : {}),
      ...(params.serviceId ? { serviceId: params.serviceId } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      ...(params.scheduledFrom || params.scheduledTo
        ? {
            scheduledAt: {
              ...(params.scheduledFrom ? { gte: params.scheduledFrom } : {}),
              ...(params.scheduledTo ? { lte: params.scheduledTo } : {}),
            },
          }
        : {}),
      ...(params.search ? this.searchWhere(params.search) : {}),
    });

    return Promise.all([
      this.prisma.workItem.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ scheduledAt: 'desc' }, { createdAt: 'desc' }],
        include: workItemInclude,
      }),
      this.prisma.workItem.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: {
      contactId: string;
      serviceId?: string | null;
      leadId?: string | null;
      title: string;
      type?: string | null;
      status?: WorkItemStatus;
      description?: string | null;
      scheduledAt?: Date | null;
      startedAt?: Date | null;
      completedAt?: Date | null;
      amount?: Prisma.Decimal | null;
      assignedToId?: string | null;
    },
    createdById: string,
  ): Promise<WorkItemWithRelations> {
    return this.prisma.workItem.create({
      data: {
        business: { connect: { id: businessId } },
        contact: { connect: { id: data.contactId } },
        service: data.serviceId
          ? { connect: { id: data.serviceId } }
          : undefined,
        lead: data.leadId ? { connect: { id: data.leadId } } : undefined,
        assignedTo: data.assignedToId
          ? { connect: { id: data.assignedToId } }
          : undefined,
        title: data.title,
        type: data.type,
        status: data.status,
        description: data.description,
        scheduledAt: data.scheduledAt,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        amount: data.amount,
        createdBy: { connect: { id: createdById } },
      },
      include: workItemInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.WorkItemUpdateInput,
  ): Promise<WorkItemWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.workItem.update({
      where: { id },
      data,
      include: workItemInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return false;
    }
    await this.prisma.workItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
