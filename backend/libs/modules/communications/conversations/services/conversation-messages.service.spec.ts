import {
  ConversationChannel,
  ConversationDirection,
  ConversationStatus,
  IntegrationStatus,
  MessageStatus,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import { OutboundMessageDispatchService } from '@app/modules/communications/messages/services/outbound-message-dispatch.service';
import { PlatformEmailProvisioningService } from '@app/modules/integrations/integrations/email/services/platform-email-provisioning.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ConversationsRepository } from '../repositories/conversations.repository';
import { ConversationMessagesService } from './conversation-messages.service';
import { ConversationRealtimeService } from './conversation-realtime.service';
import { WhatsAppSessionWindowService } from './whatsapp-session-window.service';

describe('ConversationMessagesService.retry', () => {
  let service: ConversationMessagesService;

  const conversationsRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const messagesRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const businessIntegrationRepository = {
    findByBusinessAndKey: jest.fn(),
  };
  const platformEmailProvisioning = {
    ensurePlatformDefaultEmail: jest.fn(),
  };
  const outboundMessageDispatch = {
    dispatch: jest.fn(),
  };
  const whatsAppSessionWindowService = {
    getSessionStateForConversation: jest.fn(),
  };
  const idempotencyService = {
    release: jest.fn(),
  };
  const realtime = {
    publishMessageUpdated: jest.fn(),
    publishConversationUpdated: jest.fn(),
  };
  const auditService = {
    log: jest.fn(),
  };

  const actor = {
    id: 'user-1',
    businessId: 'biz-1',
    businessRole: 'OWNER',
  } as never;

  const conversation = {
    id: 'conv-1',
    businessId: 'biz-1',
    contactId: 'contact-1',
    channel: ConversationChannel.SMS,
    providerKey: 'twilio',
    resourceId: 'resource-1',
    status: ConversationStatus.OPEN,
    contact: { blockedAt: null },
  };

  const failedMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    businessId: 'biz-1',
    direction: ConversationDirection.OUTBOUND,
    status: MessageStatus.FAILED,
    text: 'hello',
    attachments: null,
    metadata: null,
    errorMessage: 'Provider error',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.MESSAGE_SEND_ASYNC = 'true';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationMessagesService,
        { provide: ConversationsRepository, useValue: conversationsRepository },
        {
          provide: ConversationMessagesRepository,
          useValue: messagesRepository,
        },
        {
          provide: BusinessIntegrationRepository,
          useValue: businessIntegrationRepository,
        },
        {
          provide: PlatformEmailProvisioningService,
          useValue: platformEmailProvisioning,
        },
        {
          provide: OutboundMessageDispatchService,
          useValue: outboundMessageDispatch,
        },
        {
          provide: WhatsAppSessionWindowService,
          useValue: whatsAppSessionWindowService,
        },
        { provide: IdempotencyService, useValue: idempotencyService },
        { provide: ConversationRealtimeService, useValue: realtime },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get(ConversationMessagesService);

    conversationsRepository.findById.mockResolvedValue(conversation);
    messagesRepository.findById.mockResolvedValue(failedMessage);
    messagesRepository.update.mockResolvedValue({
      ...failedMessage,
      status: MessageStatus.PENDING,
      errorMessage: null,
    });
    businessIntegrationRepository.findByBusinessAndKey.mockResolvedValue({
      status: IntegrationStatus.CONNECTED,
    });
    outboundMessageDispatch.dispatch.mockResolvedValue({
      asyncJob: { id: 'job-1' },
    });
    idempotencyService.release.mockResolvedValue(undefined);
    realtime.publishMessageUpdated.mockResolvedValue(undefined);
    realtime.publishConversationUpdated.mockResolvedValue(undefined);
    auditService.log.mockResolvedValue(undefined);
  });

  it('resets FAILED message to PENDING, releases claim, and re-dispatches', async () => {
    const result = await service.retry(
      'biz-1',
      'conv-1',
      'msg-1',
      actor,
      'idem-retry-1',
    );

    expect(idempotencyService.release).toHaveBeenCalledWith(
      'send-message:msg-1',
      'msg-1',
    );
    expect(messagesRepository.update).toHaveBeenCalledWith('msg-1', {
      status: MessageStatus.PENDING,
      errorMessage: null,
      externalMessageId: null,
      sentAt: null,
    });
    expect(realtime.publishMessageUpdated).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({
        conversationId: 'conv-1',
        messageId: 'msg-1',
        status: MessageStatus.PENDING,
      }),
    );
    expect(outboundMessageDispatch.dispatch).toHaveBeenCalledWith(
      {
        messageId: 'msg-1',
        businessId: 'biz-1',
        conversationId: 'conv-1',
      },
      'idem-retry-1',
      'user-1',
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'message.retried',
        entityId: 'msg-1',
      }),
    );
    expect(result.data.status).toBe(MessageStatus.PENDING);
    expect(result.meta.jobId).toBe('job-1');
  });

  it('rejects retry when message is not FAILED', async () => {
    messagesRepository.findById.mockResolvedValue({
      ...failedMessage,
      status: MessageStatus.SENT,
    });

    await expect(
      service.retry('biz-1', 'conv-1', 'msg-1', actor),
    ).rejects.toMatchObject({
      code: ErrorCode.CONVERSATION_MESSAGE_RETRY_NOT_ALLOWED,
    });
  });

  it('rejects retry for inbound messages', async () => {
    messagesRepository.findById.mockResolvedValue({
      ...failedMessage,
      direction: ConversationDirection.INBOUND,
    });

    await expect(
      service.retry('biz-1', 'conv-1', 'msg-1', actor),
    ).rejects.toMatchObject({
      code: ErrorCode.CONVERSATION_MESSAGE_RETRY_NOT_ALLOWED,
    });
  });

  it('rejects retry when message belongs to another conversation', async () => {
    messagesRepository.findById.mockResolvedValue({
      ...failedMessage,
      conversationId: 'other-conv',
    });

    await expect(
      service.retry('biz-1', 'conv-1', 'msg-1', actor),
    ).rejects.toMatchObject({
      code: ErrorCode.CONVERSATION_MESSAGE_NOT_FOUND,
    });
  });
});
