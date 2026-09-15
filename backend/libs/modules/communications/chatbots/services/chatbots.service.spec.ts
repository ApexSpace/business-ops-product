import { ChatbotStatus, type Chatbot } from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { ChatbotsService } from './chatbots.service';
import { ChatbotRulesRepository } from '../repositories/chatbot-rules.repository';
import { ChatbotsRepository } from '../repositories/chatbots.repository';
import { ChatbotEmbedService } from './chatbot-embed.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { defaultWebChatSettingsBundle } from '../utils/chatbot-settings.util';

describe('ChatbotsService.ensureDefaultChatbot', () => {
  const businessId = 'biz-1';
  const actor = { id: 'user-1' } as RequestUser;

  const chatbotsRepository = {
    getBusinessDefaultChatbotId: jest.fn(),
    findById: jest.fn(),
    findFirstForDefault: jest.fn(),
    setBusinessDefaultChatbotId: jest.fn(),
    create: jest.fn(),
    countConversationsForChatbot: jest.fn(),
    lastConversationMessageAt: jest.fn(),
    getSessionStats: jest.fn(),
  } as unknown as jest.Mocked<ChatbotsRepository>;

  const rulesRepository = {} as ChatbotRulesRepository;
  const embedService = {} as ChatbotEmbedService;
  const auditService = {
    log: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;

  const service = new ChatbotsService(
    chatbotsRepository,
    rulesRepository,
    embedService,
    auditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns existing default chatbot when pointer is valid', async () => {
    const chatbot = { id: 'bot-1', businessId } as Chatbot;
    chatbotsRepository.getBusinessDefaultChatbotId.mockResolvedValue('bot-1');
    chatbotsRepository.findById.mockResolvedValue(chatbot);

    await expect(service.ensureDefaultChatbot(businessId)).resolves.toBe(
      chatbot,
    );
    expect(chatbotsRepository.create).not.toHaveBeenCalled();
  });

  it('promotes oldest active chatbot when default pointer is missing', async () => {
    const chatbot = {
      id: 'bot-active',
      businessId,
      status: ChatbotStatus.ACTIVE,
    } as Chatbot;
    chatbotsRepository.getBusinessDefaultChatbotId.mockResolvedValue(null);
    chatbotsRepository.findFirstForDefault.mockResolvedValue(chatbot);

    await expect(service.ensureDefaultChatbot(businessId)).resolves.toBe(
      chatbot,
    );
    expect(chatbotsRepository.setBusinessDefaultChatbotId).toHaveBeenCalledWith(
      businessId,
      'bot-active',
    );
    expect(chatbotsRepository.create).not.toHaveBeenCalled();
  });

  it('creates web chat bot when business has no chatbots', async () => {
    const bundle = defaultWebChatSettingsBundle();
    const created = {
      id: 'bot-new',
      businessId,
      name: 'Web Chat',
      status: ChatbotStatus.DRAFT,
    } as Chatbot;

    chatbotsRepository.getBusinessDefaultChatbotId.mockResolvedValue(null);
    chatbotsRepository.findFirstForDefault.mockResolvedValue(null);
    chatbotsRepository.create.mockResolvedValue(created);

    await expect(service.ensureDefaultChatbot(businessId, actor)).resolves.toBe(
      created,
    );
    expect(chatbotsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Web Chat',
        status: ChatbotStatus.DRAFT,
      }),
    );
    expect(chatbotsRepository.setBusinessDefaultChatbotId).toHaveBeenCalledWith(
      businessId,
      'bot-new',
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId,
        entityId: 'bot-new',
        metadata: { source: 'default_web_chat' },
      }),
    );
    expect(bundle.messaging.welcomeMessage).toContain('Hey there');
  });

  it('re-resolves when default pointer references a deleted chatbot', async () => {
    const replacement = { id: 'bot-2', businessId } as Chatbot;
    chatbotsRepository.getBusinessDefaultChatbotId.mockResolvedValue('bot-deleted');
    chatbotsRepository.findById.mockResolvedValue(null);
    chatbotsRepository.findFirstForDefault.mockResolvedValue(replacement);

    await expect(service.ensureDefaultChatbot(businessId)).resolves.toBe(
      replacement,
    );
    expect(chatbotsRepository.setBusinessDefaultChatbotId).toHaveBeenCalledWith(
      businessId,
      'bot-2',
    );
  });
});
