import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppSessionWindowService } from './whatsapp-session-window.service';
import { ConversationMessagesRepository } from '../repositories/conversation-messages.repository';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';

describe('WhatsAppSessionWindowService', () => {
  let service: WhatsAppSessionWindowService;
  const messagesRepository = {
    findLastInboundContactMessage: jest.fn(),
    findLastInboundContactMessageForContact: jest.fn(),
  };
  const contactRepository = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppSessionWindowService,
        {
          provide: ConversationMessagesRepository,
          useValue: messagesRepository,
        },
        {
          provide: ContactRepository,
          useValue: contactRepository,
        },
      ],
    }).compile();

    service = module.get(WhatsAppSessionWindowService);
  });

  it('returns closed session when no inbound exists', async () => {
    messagesRepository.findLastInboundContactMessage.mockResolvedValue(null);

    await expect(
      service.getSessionStateForConversation('biz-1', 'conv-1'),
    ).resolves.toEqual({
      sessionOpen: false,
      requiresTemplate: true,
      lastInboundAt: null,
    });
  });

  it('returns open session for recent inbound', async () => {
    const now = new Date('2026-06-13T12:00:00.000Z');
    const lastInboundAt = new Date('2026-06-13T10:00:00.000Z');
    messagesRepository.findLastInboundContactMessage.mockResolvedValue({
      createdAt: lastInboundAt,
    });

    await expect(
      service.getSessionStateForConversation('biz-1', 'conv-1', now),
    ).resolves.toEqual({
      sessionOpen: true,
      requiresTemplate: false,
      lastInboundAt,
    });
  });
});
