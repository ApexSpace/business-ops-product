import { Injectable } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

const taskInclude = {
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
  lead: {
    select: { id: true, title: true },
  },
  assignedTo: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: typeof taskInclude;
}>;

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.TaskWhereInput,
  ): Prisma.TaskWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  private searchWhere(search: string): Prisma.TaskWhereInput {
    return {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { descriptionText: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  findById(businessId: string, id: string): Promise<TaskWithRelations | null> {
    return this.prisma.task.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: taskInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      contactId?: string;
      leadId?: string;
      assignedToId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueFrom?: Date;
      dueTo?: Date;
    },
  ): Promise<{ items: TaskWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
      ...(params.leadId ? { leadId: params.leadId } : {}),
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      ...(params.dueFrom || params.dueTo
        ? {
            dueAt: {
              ...(params.dueFrom ? { gte: params.dueFrom } : {}),
              ...(params.dueTo ? { lte: params.dueTo } : {}),
            },
          }
        : {}),
      ...(params.search ? this.searchWhere(params.search) : {}),
    });

    return Promise.all([
      this.prisma.task.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        include: taskInclude,
      }),
      this.prisma.task.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: {
      contactId?: string | null;
      leadId?: string | null;
      title: string;
      description: string;
      descriptionText?: string | null;
      dueAt: Date;
      status?: TaskStatus;
      priority?: TaskPriority | null;
      assignedToId?: string | null;
    },
    createdById: string,
  ): Promise<TaskWithRelations> {
    return this.prisma.task.create({
      data: {
        business: { connect: { id: businessId } },
        contact: data.contactId
          ? { connect: { id: data.contactId } }
          : undefined,
        lead: data.leadId ? { connect: { id: data.leadId } } : undefined,
        assignedTo: data.assignedToId
          ? { connect: { id: data.assignedToId } }
          : undefined,
        title: data.title,
        description: data.description,
        descriptionText: data.descriptionText,
        dueAt: data.dueAt,
        status: data.status,
        priority: data.priority,
        createdBy: { connect: { id: createdById } },
      },
      include: taskInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.TaskUpdateInput,
  ): Promise<TaskWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return false;
    }
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
