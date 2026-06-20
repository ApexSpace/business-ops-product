import { Injectable } from '@nestjs/common';
import { ChatbotRule, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ChatbotRulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(
    businessId: string,
    chatbotId: string,
    id: string,
  ): Promise<ChatbotRule | null> {
    return this.prisma.chatbotRule.findFirst({
      where: { id, businessId, chatbotId },
    });
  }

  findManyByChatbot(
    businessId: string,
    chatbotId: string,
  ): Promise<ChatbotRule[]> {
    return this.prisma.chatbotRule.findMany({
      where: { businessId, chatbotId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findActiveByChatbot(
    businessId: string,
    chatbotId: string,
  ): Promise<ChatbotRule[]> {
    return this.prisma.chatbotRule.findMany({
      where: { businessId, chatbotId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(data: Prisma.ChatbotRuleCreateInput): Promise<ChatbotRule> {
    return this.prisma.chatbotRule.create({ data });
  }

  update(
    id: string,
    data: Prisma.ChatbotRuleUpdateInput,
  ): Promise<ChatbotRule> {
    return this.prisma.chatbotRule.update({ where: { id }, data });
  }

  delete(businessId: string, chatbotId: string, id: string): Promise<void> {
    return this.prisma.chatbotRule
      .deleteMany({ where: { id, businessId, chatbotId } })
      .then(() => undefined);
  }

  async getNextSortOrder(
    businessId: string,
    chatbotId: string,
  ): Promise<number> {
    const max = await this.prisma.chatbotRule.aggregate({
      where: { businessId, chatbotId },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  async reorder(
    businessId: string,
    chatbotId: string,
    ruleIds: string[],
  ): Promise<ChatbotRule[]> {
    return this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < ruleIds.length; index += 1) {
        await tx.chatbotRule.updateMany({
          where: { id: ruleIds[index], businessId, chatbotId },
          data: { sortOrder: index },
        });
      }
      return tx.chatbotRule.findMany({
        where: { businessId, chatbotId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
    });
  }
}
