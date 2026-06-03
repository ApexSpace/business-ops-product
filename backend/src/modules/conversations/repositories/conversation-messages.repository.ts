import { Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationMessage,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class ConversationMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByExternalMessageId(
    businessId: string,
    channel: ConversationChannel,
    externalMessageId: string,
  ): Promise<ConversationMessage | null> {
    return this.prisma.conversationMessage.findFirst({
      where: { businessId, channel, externalMessageId },
    });
  }

  findManyByConversation(
    businessId: string,
    conversationId: string,
    params: { skip: number; take: number },
  ): Promise<{ items: ConversationMessage[]; total: number }> {
    const where = { businessId, conversationId };

    return this.prisma.$transaction([
      this.prisma.conversationMessage.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.conversationMessage.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
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
