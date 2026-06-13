import { randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ConversationChannel,
  ConversationDirection,
  IntegrationStatus,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { OutboundMessageDispatchService } from '@app/modules/communications/messages/services/outbound-message-dispatch.service';
import { WEBCHAT_PROVIDER_KEY } from '@app/modules/communications/chatbots/utils/chatbot-public-key.util';
import { isPlatformEmailConversation } from '@app/modules/communications/email/utils/platform-email-channel.util';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { SendMessageDto } from '../dto/send-message.dto';
import { ListMessagesQueryDto } from '../dto/list-messages-query.dto';
import { ConversationMessageResponseDto } from '../dto/conversation-response.dto';
import { toConversationMessageResponse } from '../mappers/conversation.mapper';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { WhatsAppSessionWindowService } from './whatsapp-session-window.service';
import type { SendWhatsAppTemplateDto } from '../dto/send-message.dto';
import { buildWhatsAppTemplateDisplayText } from '@app/modules/integrations/whatsapp/utils/whatsapp-template-display.util';

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
  ) {}

  async list(
    businessId: string,
    conversationId: string,
    query: ListMessagesQueryDto,
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
    await this.requireConversation(businessId, conversationId);
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
    );

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
        await this.platformEmailProvisioning.ensurePlatformDefaultEmail(businessId);
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

    const text = dto.text?.trim() ?? '';
    const hasAttachments =
      Array.isArray(dto.attachments) && dto.attachments.length > 0;
    const hasTemplate = Boolean(dto.template?.name?.trim());
    const hasFreeForm = Boolean(text) || hasAttachments;

    if (conversation.channel === ConversationChannel.WHATSAPP) {
      const session =
        await this.whatsAppSessionWindowService.getSessionStateForConversation(
          businessId,
          conversation.id,
        );

      if (session.requiresTemplate) {
        if (!hasTemplate) {
          throw new AppException(
            ErrorCode.WHATSAPP_SESSION_CLOSED,
            hasFreeForm
              ? 'The 24-hour WhatsApp customer service window has closed. Send an approved template instead of a free-form message.'
              : 'An approved WhatsApp template is required outside the 24-hour customer service window.',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
      }
    }

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
