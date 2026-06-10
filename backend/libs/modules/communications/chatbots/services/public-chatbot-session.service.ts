import { createHash, randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Chatbot,
  ChatbotStatus,
  ConversationChannel,
  ConversationDirection,
  ConversationStatus,
  MessageSenderType,
  MessageStatus,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { ConversationMessagesRepository } from '@app/modules/communications/conversations/repositories/conversation-messages.repository';
import { ConversationsRepository } from '@app/modules/communications/conversations/repositories/conversations.repository';
import {
  SendChatbotMessageDto,
  StartChatbotSessionDto,
} from '../dto/chatbot.dto';
import {
  PublicChatbotConfigDto,
  PublicChatbotMessageDto,
  PublicChatbotSessionDto,
} from '../dto/chatbot-response.dto';
import {
  toPublicChatbotConfig,
  toPublicChatbotMessage,
} from '../mappers/chatbot.mapper';
import { parseChatbotSettings } from '../utils/chatbot-settings.util';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import { ChatbotSessionsRepository } from '../repositories/chatbot-sessions.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';
import {
  CHATBOT_MAX_MESSAGE_LENGTH,
  WEBCHAT_PROVIDER_KEY,
} from '../utils/chatbot-public-key.util';
import { ChatbotAutoReplyService } from './chatbot-auto-reply.service';
import { ChatbotContactResolverService } from './chatbot-contact-resolver.service';

@Injectable()
export class PublicChatbotSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatbotsRepository: ChatbotsRepository,
    private readonly sessionsRepository: ChatbotSessionsRepository,
    private readonly rulesRepository: ChatbotRulesRepository,
    private readonly conversationsRepository: ConversationsRepository,
    private readonly messagesRepository: ConversationMessagesRepository,
    private readonly contactResolver: ChatbotContactResolverService,
    private readonly autoReply: ChatbotAutoReplyService,
  ) {}

  async getConfig(publicKey: string): Promise<PublicChatbotConfigDto> {
    const chatbot = await this.requirePublicChatbot(publicKey);
    const business = await this.prisma.business.findFirst({
      where: { id: chatbot.businessId, deletedAt: null },
      select: { name: true, displayName: true },
    });
    const businessName =
      business?.displayName?.trim() || business?.name || 'Support';
    return toPublicChatbotConfig(chatbot, businessName);
  }

  async startSession(
    publicKey: string,
    dto: StartChatbotSessionDto,
    context: { userAgent?: string; referer?: string; ip?: string },
  ): Promise<PublicChatbotSessionDto> {
    const chatbot = await this.requirePublicChatbot(publicKey);
    const settings = parseChatbotSettings(chatbot);
    const businessId = chatbot.businessId;

    if (
      settings.form.collectContactInfo &&
      !dto.anonymous &&
      settings.form.requireName &&
      !dto.visitorName?.trim()
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      settings.form.collectContactInfo &&
      !dto.anonymous &&
      settings.form.requireEmail &&
      !dto.visitorEmail?.trim()
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Email is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contact = dto.anonymous
      ? null
      : await this.contactResolver.resolveOrCreate(businessId, {
          visitorId: dto.visitorId,
          visitorName: dto.visitorName,
          visitorEmail: dto.visitorEmail,
          visitorPhone: dto.visitorPhone,
          chatbotId: chatbot.id,
          pageUrl: dto.pageUrl,
        });

    const title =
      contact?.displayName?.trim() ||
      dto.visitorName?.trim() ||
      'Website Visitor';

    let conversation =
      await this.conversationsRepository.findByExternalConversationId(
        businessId,
        ConversationChannel.WEBCHAT,
        dto.visitorId,
      );

    if (!conversation) {
      conversation = await this.conversationsRepository.create({
        business: { connect: { id: businessId } },
        contact: contact ? { connect: { id: contact.id } } : undefined,
        channel: ConversationChannel.WEBCHAT,
        providerKey: WEBCHAT_PROVIDER_KEY,
        resourceId: chatbot.id,
        externalConversationId: dto.visitorId,
        externalParticipantId: dto.visitorId,
        title,
        status: ConversationStatus.OPEN,
        unreadCount: 0,
        metadata: {
          chatbotId: chatbot.id,
          publicKey: chatbot.publicKey,
          pageUrl: dto.pageUrl ?? null,
          referrer: dto.referrer ?? context.referer ?? null,
          visitorId: dto.visitorId,
        },
      });
    } else if (contact && !conversation.contactId) {
      conversation = await this.conversationsRepository.update(
        conversation.id,
        {
          contact: { connect: { id: contact.id } },
          title,
        },
      );
    }

    const session = await this.sessionsRepository.create({
      business: { connect: { id: businessId } },
      chatbot: { connect: { id: chatbot.id } },
      conversationId: conversation.id,
      contactId: contact?.id ?? undefined,
      visitorId: dto.visitorId,
      visitorName: dto.visitorName?.trim() ?? null,
      visitorEmail: dto.visitorEmail?.trim().toLowerCase() ?? null,
      visitorPhone: dto.visitorPhone?.trim() ?? null,
      pageUrl: dto.pageUrl ?? null,
      referrer: dto.referrer ?? context.referer ?? null,
      userAgent: context.userAgent ?? null,
      ipHash: context.ip ? this.hashIp(context.ip) : null,
    });

    if (dto.initialMessage?.trim()) {
      await this.appendInboundAndMaybeReply(
        chatbot,
        session.id,
        conversation.id,
        businessId,
        contact?.id ?? null,
        dto.visitorId,
        dto.initialMessage.trim(),
      );
    }

    return { sessionId: session.id, conversationId: conversation.id };
  }

  async sendMessage(
    sessionId: string,
    dto: SendChatbotMessageDto,
  ): Promise<PublicChatbotMessageDto> {
    const text = dto.text.trim().slice(0, CHATBOT_MAX_MESSAGE_LENGTH);
    const session = await this.requireSession(sessionId);
    const chatbot = await this.chatbotsRepository.findById(
      session.businessId,
      session.chatbotId,
    );
    if (!chatbot) {
      throw new AppException(
        ErrorCode.CHATBOT_NOT_AVAILABLE,
        'Chat widget is unavailable',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.requirePublicChatbot(chatbot.publicKey);

    const conversationId = session.conversationId;
    if (!conversationId) {
      throw new AppException(
        ErrorCode.CHATBOT_SESSION_NOT_FOUND,
        'Session not ready',
        HttpStatus.BAD_REQUEST,
      );
    }

    const inbound = await this.appendInboundAndMaybeReply(
      chatbot,
      sessionId,
      conversationId,
      session.businessId,
      session.contactId,
      session.visitorId,
      text,
    );
    return inbound;
  }

  async listMessages(
    sessionId: string,
    since?: string,
  ): Promise<PublicChatbotMessageDto[]> {
    const session = await this.requireSession(sessionId);
    if (!session.conversationId) {
      return [];
    }

    const where: {
      businessId: string;
      conversationId: string;
      createdAt?: { gt: Date };
    } = {
      businessId: session.businessId,
      conversationId: session.conversationId,
    };
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        where.createdAt = { gt: sinceDate };
      }
    }

    const messages = await this.prisma.conversationMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return messages.map((m) =>
      toPublicChatbotMessage({
        id: m.id,
        direction: m.direction,
        senderType: m.senderType,
        text: m.text,
        createdAt: m.createdAt,
      }),
    );
  }

  private async appendInboundAndMaybeReply(
    chatbot: Chatbot,
    sessionId: string,
    conversationId: string,
    businessId: string,
    contactId: string | null,
    visitorId: string,
    text: string,
  ): Promise<PublicChatbotMessageDto> {
    const now = new Date();
    const externalMessageId = `webchat-in-${randomUUID()}`;
    const preview = text.slice(0, 500);

    const inbound = await this.messagesRepository.create({
      business: { connect: { id: businessId } },
      conversation: { connect: { id: conversationId } },
      contact: contactId ? { connect: { id: contactId } } : undefined,
      channel: ConversationChannel.WEBCHAT,
      providerKey: WEBCHAT_PROVIDER_KEY,
      direction: ConversationDirection.INBOUND,
      senderType: MessageSenderType.CONTACT,
      text,
      status: MessageStatus.RECEIVED,
      externalMessageId,
      externalSenderId: visitorId,
      receivedAt: now,
    });

    await this.conversationsRepository.update(conversationId, {
      lastMessageAt: now,
      lastMessagePreview: preview,
      unreadCount: { increment: 1 },
      status: ConversationStatus.OPEN,
    });

    const rules = await this.rulesRepository.findActiveByChatbot(
      businessId,
      chatbot.id,
    );
    const replyText = this.autoReply.resolveReply(chatbot, rules, text);
    if (replyText) {
      await this.sendBotReply(
        businessId,
        conversationId,
        contactId,
        visitorId,
        replyText,
      );
    }

    return toPublicChatbotMessage({
      id: inbound.id,
      direction: 'INBOUND',
      senderType: inbound.senderType,
      text: inbound.text,
      createdAt: inbound.createdAt,
    });
  }

  private async sendBotReply(
    businessId: string,
    conversationId: string,
    contactId: string | null,
    visitorId: string,
    text: string,
  ): Promise<void> {
    const now = new Date();
    await this.messagesRepository.create({
      business: { connect: { id: businessId } },
      conversation: { connect: { id: conversationId } },
      contact: contactId ? { connect: { id: contactId } } : undefined,
      channel: ConversationChannel.WEBCHAT,
      providerKey: WEBCHAT_PROVIDER_KEY,
      direction: ConversationDirection.OUTBOUND,
      senderType: MessageSenderType.SYSTEM,
      text,
      status: MessageStatus.SENT,
      externalMessageId: `webchat-out-${randomUUID()}`,
      externalRecipientId: visitorId,
      sentAt: now,
    });
    await this.conversationsRepository.update(conversationId, {
      lastMessageAt: now,
      lastMessagePreview: text.slice(0, 500),
    });
  }

  private async requirePublicChatbot(publicKey: string) {
    const chatbot = await this.chatbotsRepository.findByPublicKey(publicKey);
    const settings = chatbot ? parseChatbotSettings(chatbot) : null;
    if (
      !chatbot ||
      chatbot.status !== ChatbotStatus.ACTIVE ||
      !settings?.bot.embedEnabled
    ) {
      throw new AppException(
        ErrorCode.CHATBOT_NOT_AVAILABLE,
        'Chat widget is unavailable',
        HttpStatus.NOT_FOUND,
      );
    }
    return chatbot;
  }

  private async requireSession(sessionId: string) {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session || session.status !== 'ACTIVE') {
      throw new AppException(
        ErrorCode.CHATBOT_SESSION_NOT_FOUND,
        'Chat session not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return session;
  }

  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').slice(0, 32);
  }
}
