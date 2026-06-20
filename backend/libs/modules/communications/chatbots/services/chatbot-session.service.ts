import { HttpStatus, Injectable } from '@nestjs/common';
import { ChatbotSessionStatus, ConversationChannel } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ConversationsRepository } from '@app/modules/communications/conversations/repositories/conversations.repository';
import { ConversationRealtimeService } from '@app/modules/communications/conversations/services/conversation-realtime.service';
import { ChatbotSessionsRepository } from '../repositories/chatbot-sessions.repository';
import { parseChatbotSessionMetadata } from '../utils/chatbot-session-metadata.util';

@Injectable()
export class ChatbotSessionService {
  constructor(
    private readonly sessionsRepository: ChatbotSessionsRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly auditService: AuditService,
    private readonly realtime: ConversationRealtimeService,
  ) {}

  async endSession(
    businessId: string,
    sessionId: string,
    actor: RequestUser,
  ): Promise<{ sessionId: string; status: ChatbotSessionStatus }> {
    const session = await this.requireSession(businessId, sessionId);
    if (session.status !== ChatbotSessionStatus.ACTIVE) {
      return { sessionId: session.id, status: session.status };
    }
    const updated = await this.sessionsRepository.endSession(
      session.id,
      ChatbotSessionStatus.ENDED,
    );
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.session.ended',
      entityType: 'ChatbotSession',
      entityId: session.id,
    });
    return { sessionId: updated.id, status: updated.status };
  }

  async convertSession(
    businessId: string,
    sessionId: string,
    actor: RequestUser,
  ): Promise<{ sessionId: string; status: ChatbotSessionStatus }> {
    const session = await this.requireSession(businessId, sessionId);
    if (session.status === ChatbotSessionStatus.CONVERTED) {
      return { sessionId: session.id, status: session.status };
    }
    const updated = await this.sessionsRepository.endSession(
      session.id,
      ChatbotSessionStatus.CONVERTED,
    );
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.session.converted',
      entityType: 'ChatbotSession',
      entityId: session.id,
    });
    return { sessionId: updated.id, status: updated.status };
  }

  async endActiveSessionForConversation(
    businessId: string,
    conversationId: string,
    status: ChatbotSessionStatus,
    actor: RequestUser,
  ): Promise<{
    sessionId: string | null;
    status: ChatbotSessionStatus | null;
  }> {
    const session = await this.sessionsRepository.findActiveByConversationId(
      businessId,
      conversationId,
    );
    if (!session) {
      return { sessionId: null, status: null };
    }
    const updated = await this.sessionsRepository.endSession(
      session.id,
      status,
    );
    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action:
        status === ChatbotSessionStatus.CONVERTED
          ? 'chatbot.session.converted'
          : 'chatbot.session.ended',
      entityType: 'ChatbotSession',
      entityId: session.id,
      metadata: { conversationId },
    });
    return { sessionId: updated.id, status: updated.status };
  }

  async pauseBotForConversation(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<{ botPaused: boolean }> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );
    const session = await this.sessionsRepository.findActiveByConversationId(
      businessId,
      conversationId,
    );
    const now = new Date().toISOString();

    if (session) {
      const metadata = parseChatbotSessionMetadata(session.metadata);
      await this.sessionsRepository.update(session.id, {
        metadata: { ...metadata, botPaused: true, handoffAt: now },
      });
    }

    const conversationMetadata = this.asMetadataObject(conversation.metadata);
    await this.conversationsRepository.update(conversation.id, {
      metadata: {
        ...conversationMetadata,
        chatbotBotPaused: true,
        chatbotHandoffAt: now,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.paused',
      entityType: 'Conversation',
      entityId: conversationId,
    });

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId,
      channel: ConversationChannel.WEBCHAT,
    });

    return { botPaused: true };
  }

  async resumeBotForConversation(
    businessId: string,
    conversationId: string,
    actor: RequestUser,
  ): Promise<{ botPaused: boolean }> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );
    const session = await this.sessionsRepository.findActiveByConversationId(
      businessId,
      conversationId,
    );

    if (session) {
      const metadata = parseChatbotSessionMetadata(session.metadata);
      await this.sessionsRepository.update(session.id, {
        metadata: { ...metadata, botPaused: false, handoffAt: undefined },
      });
    }

    const conversationMetadata = this.asMetadataObject(conversation.metadata);
    await this.conversationsRepository.update(conversation.id, {
      metadata: {
        ...conversationMetadata,
        chatbotBotPaused: false,
        chatbotHandoffAt: null,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'chatbot.resumed',
      entityType: 'Conversation',
      entityId: conversationId,
    });

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId,
      channel: ConversationChannel.WEBCHAT,
    });

    return { botPaused: false };
  }

  private async requireSession(businessId: string, sessionId: string) {
    const session = await this.sessionsRepository.findByIdForBusiness(
      businessId,
      sessionId,
    );
    if (!session) {
      throw new AppException(
        ErrorCode.CHATBOT_SESSION_NOT_FOUND,
        'Chat session not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return session;
  }

  private async requireConversation(
    businessId: string,
    conversationId: string,
  ) {
    const conversation = await this.conversationsRepository.findById(
      businessId,
      conversationId,
    );
    if (!conversation) {
      throw new AppException(
        ErrorCode.CONVERSATION_NOT_FOUND,
        'Conversation not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return conversation;
  }

  private asMetadataObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }
}
