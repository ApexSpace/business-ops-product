import { Injectable } from '@nestjs/common';
import {
  Conversation,
  ConversationChannel,
  ConversationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type ConversationListFilters = {
  skip: number;
  take: number;
  channel?: ConversationChannel;
  status?: ConversationStatus;
  assignedToUserId?: string;
  assignedToMe?: boolean;
  currentUserId?: string;
  contactId?: string;
  resourceId?: string;
  search?: string;
};

@Injectable()
export class ConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ConversationWhereInput,
  ): Prisma.ConversationWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  findByExternalConversationId(
    businessId: string,
    channel: ConversationChannel,
    externalConversationId: string,
  ): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: this.activeWhere(businessId, {
        channel,
        externalConversationId,
      }),
    });
  }

  findMany(
    businessId: string,
    filters: ConversationListFilters,
  ): Promise<{ items: Conversation[]; total: number }> {
    const where = this.activeWhere(businessId, this.buildListWhere(filters));

    return this.prisma
      .$transaction([
        this.prisma.conversation.findMany({
          where,
          orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
          skip: filters.skip,
          take: filters.take,
          include: {
            contact: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.conversation.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  }

  findByContactId(
    businessId: string,
    contactId: string,
  ): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: this.activeWhere(businessId, { contactId }),
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        contact: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  create(data: Prisma.ConversationCreateInput): Promise<Conversation> {
    return this.prisma.conversation.create({ data });
  }

  update(
    id: string,
    data: Prisma.ConversationUpdateInput,
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  private buildListWhere(
    filters: ConversationListFilters,
  ): Prisma.ConversationWhereInput {
    const where: Prisma.ConversationWhereInput = {};

    if (filters.channel) {
      where.channel = filters.channel;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.contactId) {
      where.contactId = filters.contactId;
    }
    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }
    if (filters.assignedToMe && filters.currentUserId) {
      where.assignedToUserId = filters.currentUserId;
    } else if (filters.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { lastMessagePreview: { contains: term, mode: 'insensitive' } },
        {
          contact: {
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { displayName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return where;
  }
}
