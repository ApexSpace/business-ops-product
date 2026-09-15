import { Injectable } from '@nestjs/common';
import {
  ChatbotIdentityRefType,
  ChatbotSession,
  ChatbotSessionIdentityType,
  ChatbotSessionStatus,
  Prisma,
} from '@prisma/client';
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

  findActiveByVisitor(
    chatbotId: string,
    visitorId: string,
  ): Promise<ChatbotSession | null> {
    return this.prisma.chatbotSession.findFirst({
      where: {
        chatbotId,
        visitorId,
        status: ChatbotSessionStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  listByIdentity(params: {
    businessId: string;
    chatbotId?: string;
    identityRefId: string;
    identityRefType: ChatbotIdentityRefType;
  }): Promise<ChatbotSession[]> {
    return this.prisma.chatbotSession.findMany({
      where: {
        businessId: params.businessId,
        identityRefId: params.identityRefId,
        identityRefType: params.identityRefType,
        ...(params.chatbotId ? { chatbotId: params.chatbotId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: Prisma.ChatbotSessionCreateInput): Promise<ChatbotSession> {
    return this.prisma.chatbotSession.create({ data });
  }

  update(
    id: string,
    data: Prisma.ChatbotSessionUpdateInput,
  ): Promise<ChatbotSession> {
    return this.prisma.chatbotSession.update({ where: { id }, data });
  }

  endSession(
    id: string,
    status: ChatbotSessionStatus,
  ): Promise<ChatbotSession> {
    const now = new Date();
    return this.prisma.chatbotSession.update({
      where: { id },
      data: { status, endedAt: now },
    });
  }

  findActiveByConversationId(
    businessId: string,
    conversationId: string,
  ): Promise<ChatbotSession | null> {
    return this.prisma.chatbotSession.findFirst({
      where: {
        businessId,
        conversationId,
        status: ChatbotSessionStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export function claimedIdentityEquals(
  session: Pick<ChatbotSession, 'identityRefId' | 'identityRefType'>,
  identity: { id: string; refType: ChatbotIdentityRefType },
): boolean {
  return (
    session.identityRefId === identity.id &&
    session.identityRefType === identity.refType
  );
}

export function isSessionClaimed(
  session: Pick<ChatbotSession, 'identityType' | 'identityRefId'>,
): boolean {
  return (
    session.identityType === ChatbotSessionIdentityType.AUTHENTICATED &&
    !!session.identityRefId
  );
}
