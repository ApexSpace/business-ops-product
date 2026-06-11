import { Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationMessage,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ConversationMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(
    businessId: string,
    id: string,
  ): Promise<ConversationMessage | null> {
    return this.prisma.conversationMessage.findFirst({
      where: { id, businessId },
    });
  }

  findByExternalMessageId(
    businessId: string,
    channel: ConversationChannel,
    externalMessageId: string,
  ): Promise<ConversationMessage | null> {
    return this.prisma.conversationMessage.findFirst({
      where: { businessId, channel, externalMessageId },
    });
  }

  async findManyByConversation(
    businessId: string,
    conversationId: string,
    params: { skip: number; take: number },
  ): Promise<{ items: ConversationMessage[]; total: number }> {
    const where = { businessId, conversationId };

    return this.prisma
      .$transaction([
        this.prisma.conversationMessage.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: params.skip,
          take: params.take,
        }),
        this.prisma.conversationMessage.count({ where }),
      ])
      .then(([items, total]) => ({ items, total }));
  }

  /** Keyset pagination — avoids deep OFFSET scans. */
  async findManyByConversationCursor(
    businessId: string,
    conversationId: string,
    params: {
      take: number;
      cursor?: string;
      direction: 'before' | 'after';
      latest?: boolean;
    },
  ): Promise<{
    items: ConversationMessage[];
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
  }> {
    const where: Prisma.ConversationMessageWhereInput = {
      businessId,
      conversationId,
    };

    let anchor: ConversationMessage | null = null;
    if (params.cursor) {
      anchor = await this.prisma.conversationMessage.findFirst({
        where: { id: params.cursor, businessId, conversationId },
      });
      if (!anchor) {
        return {
          items: [],
          nextCursor: null,
          prevCursor: null,
          hasMore: false,
        };
      }
    }

    const direction =
      params.latest && !params.cursor ? 'before' : params.direction;
    const take = params.take;

    if (params.latest && !params.cursor) {
      const rows = await this.prisma.conversationMessage.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
      });
      const hasMore = rows.length > take;
      const slice = hasMore ? rows.slice(0, take) : rows;
      const items = slice.reverse();
      return {
        items,
        nextCursor: items[0]?.id ?? null,
        prevCursor: items[items.length - 1]?.id ?? null,
        hasMore,
      };
    }

    if (!anchor) {
      const rows = await this.prisma.conversationMessage.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: take + 1,
      });
      const hasMore = rows.length > take;
      const items = hasMore ? rows.slice(0, take) : rows;
      return {
        items,
        nextCursor: items[items.length - 1]?.id ?? null,
        prevCursor: items[0]?.id ?? null,
        hasMore,
      };
    }

    if (direction === 'before') {
      const rows = await this.prisma.conversationMessage.findMany({
        where: {
          ...where,
          OR: [
            { createdAt: { lt: anchor.createdAt } },
            { createdAt: anchor.createdAt, id: { lt: anchor.id } },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
      });
      const hasMore = rows.length > take;
      const slice = hasMore ? rows.slice(0, take) : rows;
      const items = slice.reverse();
      return {
        items,
        nextCursor: items[0]?.id ?? anchor.id,
        prevCursor: items[items.length - 1]?.id ?? null,
        hasMore,
      };
    }

    const rows = await this.prisma.conversationMessage.findMany({
      where: {
        ...where,
        OR: [
          { createdAt: { gt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { gt: anchor.id } },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    return {
      items,
      nextCursor: items[items.length - 1]?.id ?? null,
      prevCursor: items[0]?.id ?? anchor.id,
      hasMore,
    };
  }

  create(
    data: Prisma.ConversationMessageCreateInput,
  ): Promise<ConversationMessage> {
    return this.prisma.conversationMessage.create({ data });
  }

  update(
    id: string,
    data: Prisma.ConversationMessageUpdateInput,
  ): Promise<ConversationMessage> {
    return this.prisma.conversationMessage.update({
      where: { id },
      data,
    });
  }
}
