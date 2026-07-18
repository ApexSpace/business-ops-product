import { randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Conversation,
  ConversationChannel,
  ConversationDirection,
  ConversationStatus,
  IntegrationStatus,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import { OutboundMessageDispatchService } from '@app/modules/communications/messages/services/outbound-message-dispatch.service';
import { WEBCHAT_PROVIDER_KEY } from '@app/modules/communications/chatbots/utils/chatbot-public-key.util';
import { isPlatformEmailConversation } from '@app/modules/communications/email/utils/platform-email-channel.util';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ConversationMessageResponseDto } from '../dto/conversation-response.dto';
import { toConversationMessageResponse } from '../mappers/conversation.mapper';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationRealtimeService } from './conversation-realtime.service';
import { WhatsAppSessionWindowService } from './whatsapp-session-window.service';
import { buildWhatsAppTemplateDisplayText } from '@app/modules/integrations/whatsapp/utils/whatsapp-template-display.util';
import { assertCanViewConversation } from '../utils/conversation-staff-access.util';
import { assertSmsBodyWithinSegmentLimit } from '@app/modules/communications/sms/utils/sms-segment-limit.util';

type ConversationWithContact = Conversation & {
  contact?: { blockedAt: Date | null } | null;
};

export interface AsyncMessageResponse {
  data: ConversationMessageResponseDto;
  meta: {
    jobId: string;
    pollUrl: string;
    sseChannel: string;
  };
}

@Injectable()
export class ConversationMessagesService {
  constructor(
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly platformEmailProvisioning: PlatformEmailProvisioningService,
    private readonly outboundMessageDispatch: OutboundMessageDispatchService,
    private readonly whatsAppSessionWindowService: WhatsAppSessionWindowService,
    private readonly idempotencyService: IdempotencyService,
    private readonly realtime: ConversationRealtimeService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    conversationId: string,
    query: ListMessagesQueryDto,
    user: RequestUser,
  ): Promise<{
    items: ConversationMessageResponseDto[];
    meta: {
      total?: number;
      page?: number;
      limit: number;
      nextCursor?: string | null;
      prevCursor?: string | null;
      hasMore?: boolean;
    };
  }> {
    await this.requireConversation(businessId, conversationId, user);
    const { page, limit, skip, take } = getPaginationParams(query);

    if (query.cursor || query.latest) {
      const result = await this.messagesRepository.findManyByConversationCursor(
        businessId,
        conversationId,
        {
          take,
          cursor: query.cursor,
          direction: query.direction ?? 'before',
          latest: query.latest,
        },
      );
      return {
        items: result.items.map(toConversationMessageResponse),
        meta: {
          limit,
          nextCursor: result.nextCursor,
          prevCursor: result.prevCursor,
          hasMore: result.hasMore,
        },
      };
    }

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

  async remove(
    businessId: string,
    conversationId: string,
    messageId: string,
    actor: RequestUser,
  ): Promise<{ deleted: true }> {
    await this.requireConversation(businessId, conversationId, actor);

    const message = await this.messagesRepository.findById(
      businessId,
      messageId,
    );
    if (!message || message.conversationId !== conversationId) {
      throw new AppException(
        ErrorCode.CONVERSATION_MESSAGE_NOT_FOUND,
        'Message not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      message.senderType === MessageSenderType.SYSTEM ||
      message.senderType === MessageSenderType.AI_AGENT
    ) {
      throw new AppException(
        ErrorCode.CONVERSATION_MESSAGE_DELETE_NOT_ALLOWED,
        'This is an automated message and cannot be deleted.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.messagesRepository.softDelete(businessId, messageId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'conversation.message.deleted',
      entityType: 'ConversationMessage',
      entityId: messageId,
    });

    await this.realtime.publishMessageDeleted(businessId, {
      conversationId,
      messageId,
    });
    await this.realtime.publishConversationUpdated(businessId, {
      conversationId,
      id: conversationId,
    });

    return { deleted: true };
  }

  async retry(
    businessId: string,
    conversationId: string,
    messageId: string,
    actor: RequestUser,
    idempotencyKey?: string,
  ): Promise<AsyncMessageResponse> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
      actor,
    );

    const message = await this.messagesRepository.findById(
      businessId,
      messageId,
    );
    if (!message || message.conversationId !== conversationId) {
      throw new AppException(
        ErrorCode.CONVERSATION_MESSAGE_NOT_FOUND,
        'Message not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      message.direction !== ConversationDirection.OUTBOUND ||
      message.status !== MessageStatus.FAILED
    ) {
      throw new AppException(
        ErrorCode.CONVERSATION_MESSAGE_RETRY_NOT_ALLOWED,
        'Only failed outbound messages can be retried.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const channelContext = await this.assertOutboundChannelReady(
      businessId,
      conversation,
    );

    const hasTemplate = this.hasWhatsAppTemplateMetadata(message.metadata);
    const hasAttachments =
      Array.isArray(message.attachments) && message.attachments.length > 0;
    const hasFreeForm = Boolean(message.text?.trim()) || hasAttachments;

    await this.assertWhatsAppSessionAllowsSend(
      businessId,
      conversation,
      hasTemplate,
      hasFreeForm,
    );

    if (!message.text?.trim() && !hasAttachments && !hasTemplate) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Message text, a template, or at least one attachment is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const apiPrefix = process.env.API_PREFIX ?? 'api/v1';

    if (channelContext.isWebchat) {
      const now = new Date();
      const updated = await this.messagesRepository.update(message.id, {
        status: MessageStatus.SENT,
        errorMessage: null,
        sentAt: now,
        externalMessageId: `webchat-out-${randomUUID()}`,
      });

      await this.conversationsRepository.update(conversation.id, {
        lastMessageAt: now,
        lastMessagePreview: this.resolveMessagePreview(
          message.text?.trim() ?? '',
          hasAttachments,
        ),
        unreadCount: 0,
      });

      const response = toConversationMessageResponse(updated);
      await this.realtime.publishMessageUpdated(businessId, {
        conversationId: conversation.id,
        messageId: updated.id,
        status: updated.status,
        channel: conversation.channel,
        message: response,
      });
      await this.realtime.publishConversationUpdated(businessId, {
        conversationId: conversation.id,
        channel: conversation.channel,
      });

      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'message.retried',
        entityType: 'ConversationMessage',
        entityId: message.id,
      });

      return {
        data: response,
        meta: {
          jobId: updated.id,
          pollUrl: `/${apiPrefix}/jobs/${updated.id}`,
          sseChannel: `business:${businessId}`,
        },
      };
    }

    const useQueue =
      (process.env.MESSAGE_SEND_ASYNC ?? 'true').toLowerCase() === 'true';
    if (!useQueue) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Synchronous message send is disabled',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.idempotencyService.release(
      `send-message:${message.id}`,
      message.id,
    );

    const pendingMessage = await this.messagesRepository.update(message.id, {
      status: MessageStatus.PENDING,
      errorMessage: null,
      externalMessageId: null,
      sentAt: null,
    });

    await this.realtime.publishMessageUpdated(businessId, {
      conversationId: conversation.id,
      messageId: pendingMessage.id,
      status: MessageStatus.PENDING,
      channel: conversation.channel,
      errorMessage: null,
    });

    const retryIdempotencyKey =
      idempotencyKey?.trim() || `retry-${message.id}-${randomUUID()}`;

    const { asyncJob } = await this.outboundMessageDispatch.dispatch(
      {
        messageId: pendingMessage.id,
        businessId,
        conversationId: conversation.id,
      },
      retryIdempotencyKey,
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'message.retried',
      entityType: 'ConversationMessage',
      entityId: message.id,
    });

    return {
      data: toConversationMessageResponse(pendingMessage),
      meta: {
        jobId: asyncJob.id,
        pollUrl: `/${apiPrefix}/jobs/${asyncJob.id}`,
        sseChannel: `business:${businessId}`,
      },
    };
  }

  async send(
    businessId: string,
    conversationId: string,
    dto: SendMessageDto,
    actor: RequestUser,
    idempotencyKey?: string,
  ): Promise<AsyncMessageResponse> {
    const conversation = await this.requireConversation(
      businessId,
      conversationId,
      actor,
    );

    const { isWebchat, isPlatformEmail } =
      await this.assertOutboundChannelReady(businessId, conversation);

    const text = dto.text?.trim() ?? '';
    const hasAttachments =
      Array.isArray(dto.attachments) && dto.attachments.length > 0;
    const hasTemplate = Boolean(dto.template?.name?.trim());
    const hasFreeForm = Boolean(text) || hasAttachments;

    if (conversation.channel === ConversationChannel.SMS && text) {
      assertSmsBodyWithinSegmentLimit(text);
    }

    await this.assertWhatsAppSessionAllowsSend(
      businessId,
      conversation,
      hasTemplate,
      hasFreeForm,
    );

    const preview = this.resolveMessagePreview(
      text,
      hasAttachments,
      dto.template,
    );
    const templateDisplayText = dto.template
      ? buildWhatsAppTemplateDisplayText(dto.template)
      : null;
    const messageText = text || templateDisplayText || null;
    const messageBase = {
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
      text: messageText,
      attachments: (dto.attachments ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      externalRecipientId: conversation.externalParticipantId,
      externalSenderId: conversation.externalPageId ?? undefined,
    };

    const apiPrefix = process.env.API_PREFIX ?? 'api/v1';

    if (isWebchat) {
      const now = new Date();
      const message = await this.messagesRepository.create({
        ...messageBase,
        status: MessageStatus.SENT,
        sentAt: now,
        externalMessageId: `webchat-out-${randomUUID()}`,
      });

      await this.conversationsRepository.update(conversation.id, {
        lastMessageAt: now,
        lastMessagePreview: preview,
        unreadCount: 0,
      });

      const response = toConversationMessageResponse(message);
      await this.realtime.publishMessageReceived(businessId, {
        conversationId: conversation.id,
        messageId: message.id,
        status: message.status,
        channel: message.channel,
        message: response,
      });
      await this.realtime.publishConversationUpdated(businessId, {
        conversationId: conversation.id,
        channel: message.channel,
      });

      return {
        data: toConversationMessageResponse(message),
        meta: {
          jobId: message.id,
          pollUrl: `/${apiPrefix}/jobs/${message.id}`,
          sseChannel: `business:${businessId}`,
        },
      };
    }

    const useQueue =
      (process.env.MESSAGE_SEND_ASYNC ?? 'true').toLowerCase() === 'true';

    if (!useQueue) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Synchronous message send is disabled',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!text && !hasAttachments && !hasTemplate) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Message text, a template, or at least one attachment is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const messageMetadata = this.buildOutboundMessageMetadata(
      conversation.channel,
      dto,
      isPlatformEmail,
    );

    const message = await this.messagesRepository.create({
      ...messageBase,
      status: MessageStatus.PENDING,
      metadata: messageMetadata,
    });

    await this.conversationsRepository.update(conversation.id, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: preview,
      unreadCount: 0,
    });

    const { asyncJob } = await this.outboundMessageDispatch.dispatch(
      {
        messageId: message.id,
        businessId,
        conversationId: conversation.id,
      },
      idempotencyKey,
      actor.id,
    );

    return {
      data: toConversationMessageResponse(message),
      meta: {
        jobId: asyncJob.id,
        pollUrl: `/${apiPrefix}/jobs/${asyncJob.id}`,
        sseChannel: `business:${businessId}`,
      },
    };
  }

  private resolveMessagePreview(
    text: string,
    hasAttachments: boolean,
    template?: SendMessageDto['template'],
  ): string {
    if (text) {
      return text.slice(0, 500);
    }
    if (template?.name?.trim()) {
      return `Template: ${template.name.trim()}`.slice(0, 500);
    }
    if (hasAttachments) {
      return '[Attachment]';
    }
    return '';
  }

  private buildOutboundMessageMetadata(
    channel: ConversationChannel,
    dto: SendMessageDto,
    isPlatformEmail: boolean,
  ): Prisma.InputJsonValue | undefined {
    const metadata: Record<string, unknown> = {};

    if (isPlatformEmail && dto.subject?.trim()) {
      metadata.subject = dto.subject.trim();
    }

    if (channel === ConversationChannel.WHATSAPP && dto.template) {
      metadata.whatsappTemplate = {
        name: dto.template.name.trim(),
        language: dto.template.language.trim(),
        components: dto.template.components ?? [],
        ...(dto.template.headerMedia
          ? { headerMedia: dto.template.headerMedia }
          : {}),
      };
    }

    return Object.keys(metadata).length > 0
      ? (metadata as Prisma.InputJsonValue)
      : undefined;
  }

  private hasWhatsAppTemplateMetadata(metadata: unknown): boolean {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return false;
    }
    const raw = (metadata as Record<string, unknown>).whatsappTemplate;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return false;
    }
    const name =
      typeof (raw as Record<string, unknown>).name === 'string'
        ? ((raw as Record<string, unknown>).name as string).trim()
        : '';
    return Boolean(name);
  }

  private async assertOutboundChannelReady(
    businessId: string,
    conversation: ConversationWithContact,
  ): Promise<{ isWebchat: boolean; isPlatformEmail: boolean }> {
    if (conversation.status === ConversationStatus.SPAM) {
      throw new AppException(
        ErrorCode.CONVERSATION_SPAM,
        'Conversation is marked as spam. Mark as not spam to reply.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (conversation.contact?.blockedAt) {
      throw new AppException(
        ErrorCode.CONTACT_BLOCKED,
        'This contact is blocked. Unblock them to send messages.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!conversation.resourceId) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'No channel resource linked to this conversation.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isWebchat =
      conversation.channel === ConversationChannel.WEBCHAT &&
      conversation.providerKey === WEBCHAT_PROVIDER_KEY;
    const isPlatformEmail = isPlatformEmailConversation(
      conversation.channel,
      conversation.providerKey,
    );

    if (isPlatformEmail) {
      const provisioned =
        await this.platformEmailProvisioning.ensurePlatformDefaultEmail(
          businessId,
        );
      if (!provisioned) {
        throw new AppException(
          ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
          'Platform email is not configured on the server.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (!isWebchat && !isPlatformEmail) {
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
    }

    return { isWebchat, isPlatformEmail };
  }

  private async assertWhatsAppSessionAllowsSend(
    businessId: string,
    conversation: Pick<Conversation, 'id' | 'channel'>,
    hasTemplate: boolean,
    hasFreeForm: boolean,
  ): Promise<void> {
    if (conversation.channel !== ConversationChannel.WHATSAPP) {
      return;
    }

    const session =
      await this.whatsAppSessionWindowService.getSessionStateForConversation(
        businessId,
        conversation.id,
      );

    if (session.requiresTemplate && !hasTemplate) {
      throw new AppException(
        ErrorCode.WHATSAPP_SESSION_CLOSED,
        hasFreeForm
          ? 'The 24-hour WhatsApp customer service window has closed. Send an approved template instead of a free-form message.'
          : 'An approved WhatsApp template is required outside the 24-hour customer service window.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async requireConversation(
    businessId: string,
    id: string,
    user: RequestUser,
  ): Promise<ConversationWithContact> {
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
    assertCanViewConversation(user, conversation);
    return conversation as ConversationWithContact;
  }
}
