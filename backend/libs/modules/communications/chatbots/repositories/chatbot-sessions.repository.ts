import { Injectable } from '@nestjs/common';
import { ChatbotSession, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ChatbotSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<ChatbotSession | null> {
    return this.prisma.chatbotSession.findFirst({ where: { id } });
  }

  findByIdForBusiness(
    businessId: string,
    id: string,
  ): Promise<ChatbotSession | null> {
    return this.prisma.chatbotSession.findFirst({
      where: { id, businessId },
    });
  }

  create(data: Prisma.ChatbotSessionCreateInput): Promise<ChatbotSession> {
    return this.prisma.chatbotSession.create({ data });
  }

  update(id: string, data: Prisma.ChatbotSessionUpdateInput): Promise<ChatbotSession> {
    return this.prisma.chatbotSession.update({ where: { id }, data });
  }
}
