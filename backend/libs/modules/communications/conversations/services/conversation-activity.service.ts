import { Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationDirection,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationRealtimeService } from '../services/conversation-realtime.service';
import { toConversationMessageResponse } from '../mappers/conversation.mapper';
import {
  CONVERSATION_ACTIVITY_LABELS,
  type ConversationActivityType,
} from '../utils/conversation-activity.util';

@Injectable()
export class ConversationActivityService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly realtime: ConversationRealtimeService,
  ) {}

  async appendActivity(
    businessId: string,
    conversationId: string,
    activityType: ConversationActivityType,
  ): Promise<void> {
    const conversation = await this.conversationsRepository.findById(
      businessId,
      conversationId,
    );
    if (!conversation) return;

    const text = CONVERSATION_ACTIVITY_LABELS[activityType];
    const now = new Date();
    const message = await this.messagesRepository.create({
      business: { connect: { id: businessId } },
      conversation: { connect: { id: conversationId } },
      ...(conversation.contactId
        ? { contact: { connect: { id: conversation.contactId } } }
        : {}),
      channel: conversation.channel,
      providerKey: conversation.providerKey,
      direction: ConversationDirection.OUTBOUND,
      senderType: MessageSenderType.SYSTEM,
      text,
      status: MessageStatus.SENT,
      sentAt: now,
      metadata: {
        activityType,
      } as Prisma.InputJsonValue,
    });

    await this.conversationsRepository.update(conversationId, {
      lastMessageAt: now,
      lastMessagePreview: text,
    });

    await this.realtime.publishMessageReceived(businessId, {
      conversationId,
      messageId: message.id,
      channel: conversation.channel as ConversationChannel,
      status: MessageStatus.SENT,
      message: toConversationMessageResponse(message),
    });
    await this.realtime.publishConversationUpdated(businessId, {
      conversationId,
      channel: conversation.channel,
    });
  }
}
