import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Chatbot,
  ChatbotStatus,
  ConversationChannel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

export type ChatbotListItem = Chatbot & {
  _count: { sessions: number };
  sessions: { updatedAt: Date }[];
};

@Injectable()
export class ChatbotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ChatbotWhereInput,
  ): Prisma.ChatbotWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<Chatbot | null> {
    return this.prisma.chatbot.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findByPublicKey(publicKey: string): Promise<Chatbot | null> {
    return this.prisma.chatbot.findFirst({
      where: { publicKey, deletedAt: null },
    });
  }

  findMany(
    businessId: string,
    params: { skip: number; take: number; status?: ChatbotStatus },
  ): Promise<{ items: ChatbotListItem[]; total: number }> {
    const where = this.activeWhere(
      businessId,
      params.status ? { status: params.status } : undefined,
    );
    return this.prisma
      .$transaction([
        this.prisma.chatbot.findMany({
          where,
          skip: params.skip,
          take: params.take,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { sessions: true } },
            sessions: {
              take: 1,
              orderBy: { updatedAt: 'desc' },
              select: { updatedAt: true },
            },
          },
        }),
        this.prisma.chatbot.count({ where }),
      ])
      .then(([items, total]) => ({
        items: items,
        total,
      }));
  }

  create(data: Prisma.ChatbotCreateInput): Promise<Chatbot> {
    return this.prisma.chatbot.create({ data });
  }

  update(id: string, data: Prisma.ChatbotUpdateInput): Promise<Chatbot> {
    return this.prisma.chatbot.update({ where: { id }, data });
  }

  softDelete(businessId: string, id: string): Promise<Chatbot | null> {
    return this.prisma.chatbot
      .updateMany({
        where: this.activeWhere(businessId, { id }),
        data: { deletedAt: new Date(), status: ChatbotStatus.ARCHIVED },
      })
      .then((r) => (r.count > 0 ? this.findById(businessId, id) : null));
  }

  countConversationsForChatbot(
    businessId: string,
    chatbotId: string,
  ): Promise<number> {
    return this.prisma.conversation.count({
      where: {
        businessId,
        deletedAt: null,
        channel: ConversationChannel.WEBCHAT,
        resourceId: chatbotId,
      },
    });
  }

  async lastConversationMessageAt(
    businessId: string,
    chatbotId: string,
  ): Promise<Date | null> {
    const row = await this.prisma.conversation.findFirst({
      where: {
        businessId,
        deletedAt: null,
        channel: ConversationChannel.WEBCHAT,
        resourceId: chatbotId,
      },
      orderBy: { lastMessageAt: 'desc' },
      select: { lastMessageAt: true },
    });
    return row?.lastMessageAt ?? null;
  }

  async getSessionStats(
    businessId: string,
    chatbotId: string,
  ): Promise<{
    sessionsCount: number;
    activeSessionsCount: number;
    convertedSessionsCount: number;
  }> {
    const [sessionsCount, activeSessionsCount, convertedSessionsCount] =
      await Promise.all([
        this.prisma.chatbotSession.count({
          where: { businessId, chatbotId },
        }),
        this.prisma.chatbotSession.count({
          where: { businessId, chatbotId, status: 'ACTIVE' },
        }),
        this.prisma.chatbotSession.count({
          where: { businessId, chatbotId, status: 'CONVERTED' },
        }),
      ]);
    return { sessionsCount, activeSessionsCount, convertedSessionsCount };
  }

  getBusinessDefaultChatbotId(businessId: string): Promise<string | null> {
    return this.prisma.business
      .findFirst({
        where: { id: businessId, deletedAt: null },
        select: { defaultChatbotId: true },
      })
      .then((row) => row?.defaultChatbotId ?? null);
  }

  async setBusinessDefaultChatbotId(
    businessId: string,
    chatbotId: string,
  ): Promise<void> {
    const chatbot = await this.findById(businessId, chatbotId);
    if (!chatbot) {
      throw new AppException(
        ErrorCode.CHATBOT_NOT_FOUND,
        'Chatbot not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.business.update({
      where: { id: businessId },
      data: { defaultChatbotId: chatbotId },
    });
  }

  findFirstForDefault(businessId: string): Promise<Chatbot | null> {
    return this.prisma.chatbot.findFirst({
      where: this.activeWhere(businessId, { status: ChatbotStatus.ACTIVE }),
      orderBy: { createdAt: 'asc' },
    }).then(async (active) => {
      if (active) return active;
      return this.prisma.chatbot.findFirst({
        where: this.activeWhere(businessId),
        orderBy: { createdAt: 'asc' },
      });
    });
  }
}
