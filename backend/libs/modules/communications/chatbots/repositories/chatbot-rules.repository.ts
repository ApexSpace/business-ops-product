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

  update(id: string, data: Prisma.ChatbotRuleUpdateInput): Promise<ChatbotRule> {
    return this.prisma.chatbotRule.update({ where: { id }, data });
  }

  delete(businessId: string, chatbotId: string, id: string): Promise<void> {
    return this.prisma.chatbotRule
      .deleteMany({ where: { id, businessId, chatbotId } })
      .then(() => undefined);
  }
}
