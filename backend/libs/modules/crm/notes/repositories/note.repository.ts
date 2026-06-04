import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const noteInclude = {
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
  createdBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} satisfies Prisma.NoteInclude;

export type NoteWithRelations = Prisma.NoteGetPayload<{
  include: typeof noteInclude;
}>;

@Injectable()
export class NoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.NoteWhereInput,
  ): Prisma.NoteWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  private searchWhere(search: string): Prisma.NoteWhereInput {
    return {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { descriptionText: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  findById(businessId: string, id: string): Promise<NoteWithRelations | null> {
    return this.prisma.note.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: noteInclude,
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
    },
  ): Promise<{ items: NoteWithRelations[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.contactId ? { contactId: params.contactId } : {}),
      ...(params.leadId ? { leadId: params.leadId } : {}),
      ...(params.search ? this.searchWhere(params.search) : {}),
    });

    return Promise.all([
      this.prisma.note.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: noteInclude,
      }),
      this.prisma.note.count({ where }),
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
    },
    createdById: string,
  ): Promise<NoteWithRelations> {
    return this.prisma.note.create({
      data: {
        business: { connect: { id: businessId } },
        contact: data.contactId
          ? { connect: { id: data.contactId } }
          : undefined,
        lead: data.leadId ? { connect: { id: data.leadId } } : undefined,
        title: data.title,
        description: data.description,
        descriptionText: data.descriptionText,
        createdBy: { connect: { id: createdById } },
      },
      include: noteInclude,
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.NoteUpdateInput,
  ): Promise<NoteWithRelations | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.note.update({
      where: { id },
      data,
      include: noteInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<boolean> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return false;
    }
    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}
