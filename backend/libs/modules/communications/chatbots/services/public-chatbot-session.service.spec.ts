import { HttpStatus } from '@nestjs/common';
import {
  ChatbotSessionStatus,
  ChatbotStatus,
  ConversationDirection,
  MessageSenderType,
  type Chatbot,
  type ChatbotSession,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ConversationMessagesRepository } from '@app/modules/communications/conversations/repositories/conversation-messages.repository';
import { ConversationsRepository } from '@app/modules/communications/conversations/repositories/conversations.repository';
import { ConversationRealtimeService } from '@app/modules/communications/conversations/services/conversation-realtime.service';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import { ChatbotSessionsRepository } from '../repositories/chatbot-sessions.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';
import { ChatIdentityResolverService } from '../identity/chat-identity-resolver.service';
import { ChatbotAutoReplyService } from './chatbot-auto-reply.service';
import { ChatbotContactResolverService } from './chatbot-contact-resolver.service';
import { ChatbotPersonalizationPipelineService } from './chatbot-personalization-pipeline.service';
import { PublicChatbotSessionService } from './public-chatbot-session.service';

describe('ISO-05 / C-P1-09 public chatbot session publicKey binding', () => {
  const PUBLIC_KEY_A = 'key-a';
  const PUBLIC_KEY_B = 'key-b';
  const SESSION_ID = '11111111-1111-4111-8111-111111111111';

  const chatbotA = {
    id: 'bot-a',
    businessId: 'biz-a',
    publicKey: PUBLIC_KEY_A,
    status: ChatbotStatus.ACTIVE,
    appearanceSettings: null,
    chatWindowSettings: null,
    messagingSettings: null,
    businessHoursSettings: null,
    formSettings: null,
    botSettings: { embedEnabled: true },
  } as unknown as Chatbot;

  const chatbotB = {
    ...chatbotA,
    id: 'bot-b',
    businessId: 'biz-b',
    publicKey: PUBLIC_KEY_B,
  } as unknown as Chatbot;

  const sessionA = {
    id: SESSION_ID,
    businessId: 'biz-a',
    chatbotId: 'bot-a',
    status: ChatbotSessionStatus.ACTIVE,
    conversationId: 'conv-a',
    contactId: null,
    visitorId: 'visitor-1',
    visitorName: null,
    visitorEmail: null,
    identityType: 'ANONYMOUS',
    identityRefId: null,
    identityRefType: null,
  } as unknown as ChatbotSession;

  const chatbotsRepository = {
    findByPublicKey: jest.fn(),
  } as unknown as jest.Mocked<ChatbotsRepository>;

  const sessionsRepository = {
    findById: jest.fn(),
    endSession: jest.fn(),
  } as unknown as jest.Mocked<ChatbotSessionsRepository> & {
    findById: jest.Mock;
    endSession: jest.Mock;
  };

  const prisma = {
    conversationMessage: { findMany: jest.fn() },
    business: { findFirst: jest.fn() },
  } as unknown as PrismaService & {
    conversationMessage: { findMany: jest.Mock };
  };

  const service = new PublicChatbotSessionService(
    prisma,
    chatbotsRepository,
    sessionsRepository,
    {} as ChatbotRulesRepository,
    {} as ConversationsRepository,
    {} as ConversationMessagesRepository,
    {} as ChatbotContactResolverService,
    {} as ChatbotAutoReplyService,
    {} as AuditService,
    {} as ConversationRealtimeService,
    {} as ChatIdentityResolverService,
    {} as ChatbotPersonalizationPipelineService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    chatbotsRepository.findByPublicKey.mockImplementation(async (key: string) => {
      if (key === PUBLIC_KEY_A) return chatbotA;
      if (key === PUBLIC_KEY_B) return chatbotB;
      return null;
    });
    sessionsRepository.findById.mockResolvedValue(sessionA);
    prisma.conversationMessage.findMany.mockResolvedValue([
      {
        id: 'msg-1',
        direction: ConversationDirection.INBOUND,
        senderType: MessageSenderType.CONTACT,
        text: 'hello',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
  });

  async function expectSessionNotFound(
    run: () => Promise<unknown>,
  ): Promise<void> {
    try {
      await run();
      throw new Error('expected CHATBOT_SESSION_NOT_FOUND');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const err = error as AppException;
      expect(err.code).toBe(ErrorCode.CHATBOT_SESSION_NOT_FOUND);
      expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  }

  it('lists messages when publicKey binds to the session', async () => {
    const messages = await service.listMessages(PUBLIC_KEY_A, SESSION_ID);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe('hello');
    expect(prisma.conversationMessage.findMany).toHaveBeenCalled();
  });

  it('rejects read with a foreign publicKey (ISO-05)', async () => {
    await expectSessionNotFound(() =>
      service.listMessages(PUBLIC_KEY_B, SESSION_ID),
    );
    expect(prisma.conversationMessage.findMany).not.toHaveBeenCalled();
  });

  it('rejects send with sessionId alone via unknown publicKey (ISO-05)', async () => {
    await expect(service.sendMessage('unknown-key', SESSION_ID, { text: 'hi' }))
      .rejects.toMatchObject({
        code: ErrorCode.CHATBOT_NOT_AVAILABLE,
        status: HttpStatus.NOT_FOUND,
      });
    expect(sessionsRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects send when publicKey does not own the session (ISO-05)', async () => {
    await expectSessionNotFound(() =>
      service.sendMessage(PUBLIC_KEY_B, SESSION_ID, { text: 'hi' }),
    );
  });

  it('rejects getSession without a matching publicKey', async () => {
    await expectSessionNotFound(() =>
      service.getSession(PUBLIC_KEY_B, SESSION_ID),
    );
  });

  it('rejects endSession without a matching publicKey', async () => {
    await expectSessionNotFound(() =>
      service.endSession(PUBLIC_KEY_B, SESSION_ID),
    );
    expect(sessionsRepository.endSession).not.toHaveBeenCalled();
  });
});
