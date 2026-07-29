import { createHash, randomUUID } from 'crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Chatbot,
  ChatbotIdentityRefType,
  ChatbotSession,
  ChatbotSessionIdentityType,
  ChatbotSessionStatus,
  ChatbotStatus,
  Conversation,
  ConversationChannel,
  ConversationDirection,
  ConversationMessage,
  ConversationStatus,
  MessageSenderType,
  MessageStatus,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ConversationMessagesRepository } from '@app/modules/communications/conversations/repositories/conversation-messages.repository';
import { ConversationsRepository } from '@app/modules/communications/conversations/repositories/conversations.repository';
import { ConversationRealtimeService } from '@app/modules/communications/conversations/services/conversation-realtime.service';
import { toConversationMessageResponse } from '@app/modules/communications/conversations/mappers/conversation.mapper';
import {
  ClaimChatbotSessionDto,
  SendChatbotMessageDto,
  StartChatbotSessionDto,
  UpdateChatbotSessionProfileDto,
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
import { isChatbotOnline } from '../utils/chatbot-business-hours.util';
import { isChatbotDomainAllowed } from '../utils/chatbot-domain-allowlist.util';
import { parseChatbotSessionMetadata } from '../utils/chatbot-session-metadata.util';
import { resolveWelcomeMessage } from '../utils/chatbot-welcome-variant.util';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import {
  ChatbotSessionsRepository,
  claimedIdentityEquals,
} from '../repositories/chatbot-sessions.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';
import {
  CHATBOT_MAX_MESSAGE_LENGTH,
  WEBCHAT_PROVIDER_KEY,
} from '../utils/chatbot-public-key.util';
import { ChatIdentityResolverService } from '../identity/chat-identity-resolver.service';
import type { ResolvedChatIdentity } from '../identity/chat-identity-resolver';
import { ChatbotAutoReplyService } from './chatbot-auto-reply.service';
import { ChatbotContactResolverService } from './chatbot-contact-resolver.service';
import { ChatbotPersonalizationPipelineService } from './chatbot-personalization-pipeline.service';

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
    private readonly auditService: AuditService,
    private readonly realtime: ConversationRealtimeService,
    private readonly identityResolver: ChatIdentityResolverService,
    private readonly personalization: ChatbotPersonalizationPipelineService,
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
    context: {
      userAgent?: string;
      referer?: string;
      ip?: string;
      authToken?: string;
    },
  ): Promise<PublicChatbotSessionDto> {
    const chatbot = await this.requirePublicChatbot(publicKey);
    const settings = parseChatbotSettings(chatbot);
    const businessId = chatbot.businessId;
    const isOnline = isChatbotOnline(
      settings.businessHours,
      settings.messaging,
    );

    if (
      !isChatbotDomainAllowed(
        settings.bot.allowedDomains,
        dto.pageUrl,
        dto.referrer ?? context.referer,
      )
    ) {
      throw new AppException(
        ErrorCode.CHATBOT_NOT_AVAILABLE,
        'Chat widget is not available on this website',
        HttpStatus.FORBIDDEN,
      );
    }

    const requiresPhoneCapture =
      !isOnline &&
      settings.form.collectPhoneWhenOffline &&
      settings.form.collectContactInfo;

    if (requiresPhoneCapture && !dto.visitorPhone?.trim()) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Phone number is required while we are offline',
        HttpStatus.BAD_REQUEST,
      );
    }

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

    const authToken = dto.authToken?.trim() || context.authToken?.trim();
    let resolvedIdentity: ResolvedChatIdentity | null = null;
    if (authToken) {
      resolvedIdentity = await this.identityResolver.resolveForChatbot(
        authToken,
        businessId,
      );
    }

    const contact = resolvedIdentity
      ? resolvedIdentity.refType === ChatbotIdentityRefType.CONTACT
        ? await this.prisma.contact.findFirst({
            where: {
              id: resolvedIdentity.id,
              businessId,
              deletedAt: null,
            },
          })
        : null
      : dto.anonymous
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
      resolvedIdentity?.displayName?.trim() ||
      contact?.displayName?.trim() ||
      dto.visitorName?.trim() ||
      'Website Visitor';

    const identityFields = this.buildIdentityCreateFields({
      resolvedIdentity,
      contactId: contact?.id ?? null,
      visitorName: dto.visitorName,
      visitorEmail: dto.visitorEmail,
    });

    // Continue with conversation create — preserved from original below

    let conversation =
      await this.conversationsRepository.findByExternalConversationId(
        businessId,
        ConversationChannel.WEBCHAT,
        dto.visitorId,
      );

    const isNewConversation = !conversation;

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

      await this.auditService.log({
        actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
        businessId,
        action: 'conversation.created',
        entityType: 'Conversation',
        entityId: conversation.id,
        metadata: { channel: ConversationChannel.WEBCHAT },
      });

      await this.realtime.publishConversationUpdated(businessId, {
        conversationId: conversation.id,
        channel: ConversationChannel.WEBCHAT,
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
      contactId: identityFields.contactId ?? undefined,
      visitorId: dto.visitorId,
      visitorName:
        resolvedIdentity?.displayName?.trim() ||
        dto.visitorName?.trim() ||
        null,
      visitorEmail: dto.visitorEmail?.trim().toLowerCase() ?? null,
      visitorPhone: dto.visitorPhone?.trim() ?? null,
      identityType: identityFields.identityType,
      identityRefId: identityFields.identityRefId,
      identityRefType: identityFields.identityRefType,
      pageUrl: dto.pageUrl ?? null,
      referrer: dto.referrer ?? context.referer ?? null,
      userAgent: context.userAgent ?? null,
      ipHash: context.ip ? this.hashIp(context.ip) : null,
    });

    const existingMessageCount = await this.prisma.conversationMessage.count({
      where: {
        businessId,
        conversationId: conversation.id,
      },
    });

    if (existingMessageCount === 0) {
      const baseGreeting = isOnline
        ? settings.messaging.welcomeMessage
        : settings.messaging.offlineMessage ||
          settings.chatWindow.offlineMessage;
      const greeting = resolveWelcomeMessage(
        baseGreeting,
        settings.bot.welcomeVariants,
        {
          pageUrl: dto.pageUrl,
          referrer: dto.referrer ?? context.referer,
        },
      );
      if (greeting?.trim()) {
        await this.sendBotReply(
          businessId,
          conversation.id,
          contact?.id ?? null,
          dto.visitorId,
          greeting.trim(),
        );
      }
    }

    if (dto.initialMessage?.trim()) {
      await this.appendInboundAndMaybeReply(
        chatbot,
        session,
        conversation,
        contact?.id ?? null,
        dto.visitorId,
        dto.initialMessage.trim(),
        {
          isOnline,
          contactId: contact?.id ?? null,
          visitorEmail: dto.visitorEmail ?? null,
        },
      );
    } else if (isNewConversation && existingMessageCount === 0) {
      // Welcome already published via sendBotReply.
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

    const conversation = await this.conversationsRepository.findById(
      session.businessId,
      conversationId,
    );
    if (!conversation) {
      throw new AppException(
        ErrorCode.CHATBOT_SESSION_NOT_FOUND,
        'Conversation not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const settings = parseChatbotSettings(chatbot);
    const isOnline = isChatbotOnline(
      settings.businessHours,
      settings.messaging,
    );

    return this.appendInboundAndMaybeReply(
      chatbot,
      session,
      conversation,
      session.contactId,
      session.visitorId,
      text,
      {
        isOnline,
        contactId: session.contactId,
        visitorEmail: session.visitorEmail,
      },
    );
  }

  async updateSessionProfile(
    sessionId: string,
    dto: UpdateChatbotSessionProfileDto,
  ): Promise<{ contactId: string | null }> {
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

    const conversationId = session.conversationId;
    if (!conversationId) {
      throw new AppException(
        ErrorCode.CHATBOT_SESSION_NOT_FOUND,
        'Session not ready',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contact = await this.contactResolver.resolveOrCreate(
      session.businessId,
      {
        visitorId: session.visitorId,
        visitorName: dto.visitorName ?? session.visitorName ?? undefined,
        visitorEmail: dto.visitorEmail ?? session.visitorEmail ?? undefined,
        visitorPhone: dto.visitorPhone ?? session.visitorPhone ?? undefined,
        chatbotId: chatbot.id,
        pageUrl: session.pageUrl ?? undefined,
      },
    );

    if (!contact) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Could not save visitor profile',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.sessionsRepository.update(session.id, {
      visitorName: dto.visitorName?.trim() ?? session.visitorName,
      visitorEmail:
        dto.visitorEmail?.trim().toLowerCase() ?? session.visitorEmail,
      visitorPhone: dto.visitorPhone?.trim() ?? session.visitorPhone,
      contactId: contact.id,
      identityType:
        session.identityType === ChatbotSessionIdentityType.AUTHENTICATED
          ? ChatbotSessionIdentityType.AUTHENTICATED
          : ChatbotSessionIdentityType.ANONYMOUS_WITH_PROFILE,
    });

    await this.conversationsRepository.update(conversationId, {
      contact: { connect: { id: contact.id } },
      title:
        contact.displayName?.trim() || session.visitorName || 'Website Visitor',
    });

    return { contactId: contact.id };
  }

  /**
   * Scenario D — claim an anonymous session with a JWT.
   * Claim-once: reject if already claimed by a different identity.
   */
  async claimSession(
    sessionId: string,
    dto: ClaimChatbotSessionDto,
    authHeaderToken?: string,
  ): Promise<PublicChatbotSessionDto> {
    const session = await this.requireSession(sessionId);
    const token = dto.authToken?.trim() || authHeaderToken?.trim();
    if (!token) {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Authentication token is required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const identity = await this.identityResolver.resolveForChatbot(
      token,
      session.businessId,
    );

    if (session.identityRefId) {
      if (claimedIdentityEquals(session, identity)) {
        return {
          sessionId: session.id,
          conversationId: session.conversationId ?? '',
        };
      }
      throw new AppException(
        ErrorCode.CHATBOT_SESSION_ALREADY_CLAIMED,
        'This chat session is already claimed by another identity',
        HttpStatus.CONFLICT,
      );
    }

    const contactId =
      identity.refType === ChatbotIdentityRefType.CONTACT
        ? identity.id
        : session.contactId;

    await this.sessionsRepository.update(session.id, {
      identityType: ChatbotSessionIdentityType.AUTHENTICATED,
      identityRefId: identity.id,
      identityRefType: identity.refType,
      contactId: contactId ?? null,
      visitorName: identity.displayName || session.visitorName,
    });

    if (session.conversationId && contactId) {
      await this.conversationsRepository.update(session.conversationId, {
        contact: { connect: { id: contactId } },
        title: identity.displayName,
      });
    }

    return {
      sessionId: session.id,
      conversationId: session.conversationId ?? '',
    };
  }

  /** Refresh rehydration — session metadata + message history. */
  async getSession(sessionId: string): Promise<{
    sessionId: string;
    conversationId: string | null;
    visitorId: string;
    identityType: ChatbotSessionIdentityType;
    identityRefId: string | null;
    identityRefType: ChatbotIdentityRefType | null;
    visitorName: string | null;
    visitorEmail: string | null;
    status: ChatbotSessionStatus;
    messages: PublicChatbotMessageDto[];
  }> {
    const session = await this.requireSession(sessionId);
    const messages = await this.listMessages(sessionId);
    return {
      sessionId: session.id,
      conversationId: session.conversationId,
      visitorId: session.visitorId,
      identityType: session.identityType,
      identityRefId: session.identityRefId,
      identityRefType: session.identityRefType,
      visitorName: session.visitorName,
      visitorEmail: session.visitorEmail,
      status: session.status,
      messages,
    };
  }

  private buildIdentityCreateFields(input: {
    resolvedIdentity: ResolvedChatIdentity | null;
    contactId: string | null;
    visitorName?: string;
    visitorEmail?: string;
  }): {
    identityType: ChatbotSessionIdentityType;
    identityRefId: string | null;
    identityRefType: ChatbotIdentityRefType | null;
    contactId: string | null;
  } {
    if (input.resolvedIdentity) {
      return {
        identityType: ChatbotSessionIdentityType.AUTHENTICATED,
        identityRefId: input.resolvedIdentity.id,
        identityRefType: input.resolvedIdentity.refType,
        contactId:
          input.resolvedIdentity.refType === ChatbotIdentityRefType.CONTACT
            ? input.resolvedIdentity.id
            : input.contactId,
      };
    }

    const hasProfile =
      !!input.visitorName?.trim() || !!input.visitorEmail?.trim();
    return {
      identityType: hasProfile
        ? ChatbotSessionIdentityType.ANONYMOUS_WITH_PROFILE
        : ChatbotSessionIdentityType.ANONYMOUS,
      identityRefId: null,
      identityRefType: null,
      contactId: input.contactId,
    };
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

  async endSession(
    sessionId: string,
  ): Promise<{ sessionId: string; status: string }> {
    const session = await this.requireSession(sessionId);
    if (session.status !== 'ACTIVE') {
      return { sessionId: session.id, status: session.status };
    }
    const updated = await this.sessionsRepository.endSession(
      session.id,
      ChatbotSessionStatus.ENDED,
    );
    return { sessionId: updated.id, status: updated.status };
  }

  private async appendInboundAndMaybeReply(
    chatbot: Chatbot,
    session: ChatbotSession,
    conversation: Conversation,
    contactId: string | null,
    visitorId: string,
    text: string,
    context: {
      isOnline: boolean;
      contactId: string | null;
      visitorEmail?: string | null;
    },
  ): Promise<PublicChatbotMessageDto> {
    const businessId = session.businessId;
    const conversationId = conversation.id;
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

    await this.publishMessageEvents(
      businessId,
      conversationId,
      inbound,
      'conversation.message.received',
    );

    const sessionMetadata = parseChatbotSessionMetadata(session.metadata);
    const botPaused =
      sessionMetadata.botPaused ||
      this.isConversationBotPaused(conversation.metadata);

    // Personalization scaffold (context for future LLM; auto-reply still drives replies today)
    await this.personalization.buildContext(session);
    await this.personalization.retrieveKnowledge(text);
    await this.personalization.toolDefinitions();
    if (await this.personalization.needsHandoff(text)) {
      // Future handoff path — no-op stub
    }

    const rules = await this.rulesRepository.findActiveByChatbot(
      businessId,
      chatbot.id,
    );
    const reply = this.autoReply.resolveReply(chatbot, rules, text, {
      botPaused,
      isOnline: context.isOnline,
    });

    if (reply?.type === 'handoff') {
      await this.pauseBotForHandoff(
        session.id,
        conversation,
        businessId,
        contactId,
        visitorId,
        reply.text,
      );
    } else if (reply?.type === 'reply') {
      await this.sendBotReply(
        businessId,
        conversationId,
        contactId,
        visitorId,
        reply.text,
      );
    }

    return toPublicChatbotMessage({
      id: inbound.id,
      direction: 'INBOUND',
      senderType: inbound.senderType,
      text: inbound.text,
      createdAt: inbound.createdAt,
      requiresProfile: await this.resolveRequiresProfile(
        businessId,
        conversationId,
        {
          contactId: context.contactId,
          visitorEmail: context.visitorEmail ?? null,
        },
        parseChatbotSettings(chatbot),
      ),
    });
  }

  private async resolveRequiresProfile(
    businessId: string,
    conversationId: string,
    session: { contactId: string | null; visitorEmail: string | null },
    settings: ReturnType<typeof parseChatbotSettings>,
  ): Promise<'email' | null> {
    const profiling = settings.form.progressiveProfiling;
    if (!profiling?.enabled) {
      return null;
    }

    if (session.visitorEmail?.trim()) {
      return null;
    }

    if (session.contactId) {
      const contact = await this.prisma.contact.findFirst({
        where: { id: session.contactId, businessId, deletedAt: null },
        select: { email: true },
      });
      if (contact?.email?.trim()) {
        return null;
      }
    }

    const inboundCount = await this.prisma.conversationMessage.count({
      where: {
        businessId,
        conversationId,
        direction: ConversationDirection.INBOUND,
        senderType: MessageSenderType.CONTACT,
      },
    });

    if (inboundCount >= (profiling.askEmailAfterMessages ?? 2)) {
      return 'email';
    }

    return null;
  }

  private async pauseBotForHandoff(
    sessionId: string,
    conversation: Conversation,
    businessId: string,
    contactId: string | null,
    visitorId: string,
    handoffMessage: string,
  ): Promise<void> {
    const now = new Date();
    const handoffAt = now.toISOString();

    await this.sessionsRepository.update(sessionId, {
      metadata: {
        botPaused: true,
        handoffAt,
      },
    });

    const existingMetadata = this.asMetadataObject(conversation.metadata);
    await this.conversationsRepository.update(conversation.id, {
      metadata: {
        ...existingMetadata,
        chatbotBotPaused: true,
        chatbotHandoffAt: handoffAt,
      },
    });

    await this.sendBotReply(
      businessId,
      conversation.id,
      contactId,
      visitorId,
      handoffMessage,
    );

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId: conversation.id,
      channel: ConversationChannel.WEBCHAT,
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
    const message = await this.messagesRepository.create({
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

    await this.publishMessageEvents(
      businessId,
      conversationId,
      message,
      'conversation.message.received',
    );
  }

  private async publishMessageEvents(
    businessId: string,
    conversationId: string,
    message: ConversationMessage,
    auditAction: 'conversation.message.received',
  ): Promise<void> {
    const response = toConversationMessageResponse(message);

    await this.realtime.publishMessageReceived(businessId, {
      conversationId,
      messageId: message.id,
      status: message.status,
      channel: message.channel,
      message: response,
    });

    await this.realtime.publishConversationUpdated(businessId, {
      conversationId,
      channel: message.channel,
    });

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId,
      action: auditAction,
      entityType: 'ConversationMessage',
      entityId: message.id,
      metadata: {
        conversationId,
        channel: message.channel,
      },
    });
  }

  private isConversationBotPaused(metadata: Prisma.JsonValue | null): boolean {
    const value = this.asMetadataObject(metadata);
    return value.chatbotBotPaused === true;
  }

  private asMetadataObject(
    metadata: Prisma.JsonValue | null,
  ): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }
    return metadata;
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
