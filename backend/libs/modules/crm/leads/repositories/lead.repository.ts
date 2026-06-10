import { Injectable } from '@nestjs/common';
import { Lead, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const leadInclude = {
  contact: {
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneCountryCode: true,
      phoneNumber: true,
    },
  },
  pipeline: { select: { id: true, name: true } },
  pipelineStage: {
    select: { id: true, name: true, position: true, type: true },
  },
  assignedTo: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  service: {
    select: { id: true, name: true, category: true, price: true },
  },
} satisfies Prisma.LeadInclude;

export type LeadWithRelations = Prisma.LeadGetPayload<{
  include: typeof leadInclude;
}>;

@Injectable()
export class LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.LeadWhereInput,
  ): Prisma.LeadWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<LeadWithRelations | null> {
    return this.prisma.lead.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: leadInclude,
    });
  }

  findActiveByContactId(
    businessId: string,
    contactId: string,
  ): Promise<Lead | null> {
    return this.prisma.lead.findFirst({
      where: this.activeWhere(businessId, { contactId }),
    });
  }

  findByContactId(businessId: string, contactId: string): Promise<Lead | null> {
    return this.prisma.lead.findFirst({
      where: { businessId, contactId },
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      pipelineId?: string;
      pipelineStageId?: string;
      assignedToId?: string;
      status?: LeadStatus;
      contactId?: string;
    },
  ): Promise<{ items: LeadWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.pipelineId ? { pipelineId: params.pipelineId } : {}),
      ...(params.pipelineStageId
        ? { pipelineStageId: params.pipelineStageId }
        : {}),
      ...(params.assignedToId ? { assignedToId: params.assignedToId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.contactId ? { contactId: params.contactId } : {}),
    });

    return Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: leadInclude,
      }),
      this.prisma.lead.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: {
      contactId?: string | null;
      serviceId?: string | null;
      pipelineId: string;
      pipelineStageId: string;
      assignedToId?: string | null;
      title?: string | null;
      value?: Prisma.Decimal | null;
      status?: LeadStatus;
      source?: string | null;
      notes?: string | null;
    },
    createdById: string,
  ): Promise<LeadWithRelations> {
    return this.prisma.lead.create({
      data: {
        business: { connect: { id: businessId } },
        contact: data.contactId
          ? { connect: { id: data.contactId } }
          : undefined,
        service: data.serviceId
          ? { connect: { id: data.serviceId } }
          : undefined,
        pipeline: { connect: { id: data.pipelineId } },
        pipelineStage: { connect: { id: data.pipelineStageId } },
        assignedTo: data.assignedToId
          ? { connect: { id: data.assignedToId } }
          : undefined,
        title: data.title,
        value: data.value,
        status: data.status ?? LeadStatus.ACTIVE,
        source: data.source,
        notes: data.notes,
        createdBy: { connect: { id: createdById } },
      },
      include: leadInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.LeadUpdateInput,
  ): Promise<LeadWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.lead.update({
      where: { id },
      data,
      include: leadInclude,
    });
  }

  async reactivateFromContact(
    businessId: string,
    id: string,
    data: {
      contactId: string;
      serviceId?: string | null;
      pipelineId: string;
      pipelineStageId: string;
      assignedToId?: string | null;
      title?: string | null;
      value?: Prisma.Decimal | null;
      source?: string | null;
    },
  ): Promise<LeadWithRelations> {
    return this.prisma.lead.update({
      where: { id },
      data: {
        deletedAt: null,
        status: LeadStatus.ACTIVE,
        contact: { connect: { id: data.contactId } },
        service: data.serviceId
          ? { connect: { id: data.serviceId } }
          : { disconnect: true },
        pipeline: { connect: { id: data.pipelineId } },
        pipelineStage: { connect: { id: data.pipelineStageId } },
        assignedTo: data.assignedToId
          ? { connect: { id: data.assignedToId } }
          : { disconnect: true },
        title: data.title,
        value: data.value,
        source: data.source,
      },
      include: leadInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<Lead | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.lead.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        contactId: null,
      },
    });
  }
}
