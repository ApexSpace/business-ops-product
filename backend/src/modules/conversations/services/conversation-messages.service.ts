import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ConversationDirection,
  IntegrationStatus,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { getPaginationParams } from '../../../common/utils/pagination.util';
import { AuditService } from '../../audit/services/audit.service';
import { BusinessIntegrationRepository } from '../../integrations/repositories/business-integration.repository';
import { ConversationChannelAdapterRegistry } from '../adapters/conversation-channel-adapter.registry';
import { SendMessageDto } from '../dto/send-message.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ConversationMessageResponseDto } from '../dto/conversation-response.dto';
import { toConversationMessageResponse } from '../mappers/conversation.mapper';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';

@Injectable()
export class ConversationMessagesService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly adapterRegistry: ConversationChannelAdapterRegistry,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    conversationId: string,
    query: ListMessagesQueryDto,
  ): Promise<{
    items: ConversationMessageResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    await this.requireConversation(businessId, conversationId);
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } =
      await this.messagesRepository.findManyByConversation(
        businessId,
        conversationId,
        { skip, take },
      );

    return {
      items: items.map(toConversationMessageResponse),
      meta: { total, page, limit },
    };
  }

  async send(
    businessId: string,
    conversationId: string,
    dto: SendMessageDto,
    actor: RequestUser,
  ): Promise<ConversationMessageResponseDto> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
    );

    if (!conversation.resourceId) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'No channel resource linked to this conversation.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        conversation.providerKey,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        `${conversation.providerKey} is not connected.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const adapter = this.adapterRegistry.getAdapter(conversation.channel);
    const preview = dto.text.trim().slice(0, 500);
    const now = new Date();

    let message = await this.messagesRepository.create({
      business: { connect: { id: businessId } },
      conversation: { connect: { id: conversation.id } },
      contact: conversation.contactId
        ? { connect: { id: conversation.contactId } }
        : undefined,
      channel: conversation.channel,
      providerKey: conversation.providerKey,
      direction: ConversationDirection.OUTBOUND,
      senderType: MessageSenderType.USER,
      senderUserId: actor.id,
      text: dto.text.trim(),
      attachments: (dto.attachments ?? undefined) as Prisma.InputJsonValue | undefined,
      status: MessageStatus.SENT,
      sentAt: now,
      externalRecipientId: conversation.externalParticipantId,
      externalSenderId: conversation.externalPageId ?? undefined,
    });

    try {
      const result = await adapter.sendMessage({
        businessId,
        resourceId: conversation.resourceId,
        externalRecipientId: conversation.externalParticipantId,
        text: dto.text.trim(),
      });

      message = await this.messagesRepository.update(message.id, {
        externalMessageId: result.externalMessageId ?? undefined,
        status: MessageStatus.SENT,
        metadata: (result.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send message';

      message = await this.messagesRepository.update(message.id, {
        status: MessageStatus.FAILED,
        errorMessage,
      });

      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'conversation.message.failed',
        entityType: 'ConversationMessage',
        entityId: message.id,
        metadata: { conversationId: conversation.id },
      });

      throw new AppException(
        ErrorCode.CONVERSATION_MESSAGE_SEND_FAILED,
        'Unable to send message. Please check your channel connection and try again.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    await this.conversationsRepository.update(conversation.id, {
      lastMessageAt: now,
      lastMessagePreview: preview,
      unreadCount: 0,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'conversation.message.sent',
      entityType: 'ConversationMessage',
      entityId: message.id,
      metadata: { conversationId: conversation.id },
    });

    return toConversationMessageResponse(message);
  }

  private async requireConversation(businessId: string, id: string) {
    const conversation = await this.conversationsRepository.findById(
      businessId,
      id,
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
}
