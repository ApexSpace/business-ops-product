import { ConversationChannel } from '@prisma/client';
import { ConversationContactResolverService } from './conversation-contact-resolver.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { NormalizedInboundMessage } from '../adapters/meta/meta-inbound.types';

const businessId = 'biz-1';

function baseInbound(
  overrides: Partial<NormalizedInboundMessage> = {},
): NormalizedInboundMessage {
  return {
    channel: ConversationChannel.WHATSAPP,
    providerKey: 'whatsapp',
    externalResourceId: 'phone-res',
    externalConversationId: 'WHATSAPP:phone-res:923001234567',
    externalParticipantId: '923001234567',
    externalPageId: null,
    externalMessageId: 'wamid.1',
    externalSenderId: '923001234567',
    externalRecipientId: 'phone-res',
    text: 'hello',
    attachments: null,
    timestamp: new Date(),
    senderName: 'Shahbaz',
    senderProfilePictureUrl: null,
    ...overrides,
  };
}

function baseContact(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contact-1',
    businessId,
    firstName: 'Existing',
    lastName: 'Customer',
    displayName: 'Existing Customer',
    email: 'existing@example.com',
    phoneCountryCode: '+',
    phoneNumber: '923001234567',
    avatarUrl: null,
    metadata: {},
    source: 'CRM',
    companyName: null,
    timezone: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByUserId: null,
    ...overrides,
  };
}

describe('ConversationContactResolverService', () => {
  let service: ConversationContactResolverService;
  let contactRepository: jest.Mocked<ContactRepository>;
  let metaApiClient: jest.Mocked<MetaApiClient>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    contactRepository = {
      findByEmail: jest.fn(),
      findByPhoneKey: jest.fn(),
      findByMetadataExternalId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ContactRepository>;

    metaApiClient = {
      getMessengerUserProfile: jest.fn(),
      getInstagramUserProfile: jest.fn(),
    } as unknown as jest.Mocked<MetaApiClient>;

    auditService = {
      log: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    service = new ConversationContactResolverService(
      contactRepository,
      metaApiClient,
      { getEncryptionKey: () => 'test-key' } as MetaConfigService,
      auditService,
    );
  });

  it('links WhatsApp inbound to an existing contact by phone', async () => {
    const contact = baseContact();
    contactRepository.findByEmail.mockResolvedValue(null);
    contactRepository.findByPhoneKey.mockResolvedValue(contact as never);
    contactRepository.update.mockResolvedValue({
      ...contact,
      metadata: { whatsappWaId: '923001234567' },
    } as never);

    const result = await service.resolveOrCreateContact(
      businessId,
      baseInbound(),
      { metadata: {} } as never,
    );

    expect(contactRepository.findByPhoneKey).toHaveBeenCalledWith(
      businessId,
      '+923001234567',
    );
    expect(contactRepository.create).not.toHaveBeenCalled();
    expect(contactRepository.update).toHaveBeenCalled();
    expect(result.metadata).toEqual(
      expect.objectContaining({ whatsappWaId: '923001234567' }),
    );
  });

  it('links email inbound to an existing contact by email before metadata', async () => {
    const contact = baseContact({ email: 'user@example.com', phoneNumber: null });
    contactRepository.findByEmail.mockResolvedValue(contact as never);
    contactRepository.update.mockResolvedValue({
      ...contact,
      metadata: { emailAddress: 'user@example.com' },
    } as never);

    const inbound = baseInbound({
      channel: ConversationChannel.EMAIL,
      providerKey: 'email',
      externalParticipantId: 'user@example.com',
      externalConversationId: 'conv-email-1',
      senderName: 'Email User',
    });

    await service.resolveOrCreateContact(businessId, inbound, {
      metadata: {},
    } as never);

    expect(contactRepository.findByEmail).toHaveBeenCalledWith(
      businessId,
      'user@example.com',
    );
    expect(contactRepository.findByMetadataExternalId).not.toHaveBeenCalled();
    expect(contactRepository.create).not.toHaveBeenCalled();
  });

  it('creates a new contact when no identity match exists', async () => {
    contactRepository.findByEmail.mockResolvedValue(null);
    contactRepository.findByPhoneKey.mockResolvedValue(null);
    contactRepository.findByMetadataExternalId.mockResolvedValue(null);
    contactRepository.create.mockResolvedValue(
      baseContact({
        id: 'new-contact',
        email: null,
        metadata: { whatsappWaId: '923001234567' },
      }) as never,
    );

    const result = await service.resolveOrCreateContact(
      businessId,
      baseInbound(),
      { metadata: {} } as never,
    );

    expect(contactRepository.create).toHaveBeenCalledWith(
      businessId,
      expect.objectContaining({
        phoneNumber: '923001234567',
        metadata: expect.objectContaining({ whatsappWaId: '923001234567' }),
      }),
      expect.any(String),
    );
    expect(auditService.log).toHaveBeenCalled();
    expect(result.id).toBe('new-contact');
  });

  it('reuses an existing contact matched by channel metadata id', async () => {
    const contact = baseContact({
      metadata: { instagramUserId: 'ig-123' },
    });
    contactRepository.findByEmail.mockResolvedValue(null);
    contactRepository.findByPhoneKey.mockResolvedValue(null);
    contactRepository.findByMetadataExternalId.mockResolvedValue(contact as never);

    const inbound = baseInbound({
      channel: ConversationChannel.INSTAGRAM,
      providerKey: 'instagram',
      externalParticipantId: 'ig-123',
      externalConversationId: 'INSTAGRAM:ig-acc:ig-123',
      senderName: 'IG User',
    });

    const result = await service.resolveOrCreateContact(businessId, inbound, {
      metadata: {},
    } as never);

    expect(contactRepository.findByMetadataExternalId).toHaveBeenCalledWith(
      businessId,
      'instagramUserId',
      'ig-123',
    );
    expect(contactRepository.create).not.toHaveBeenCalled();
    expect(result.id).toBe('contact-1');
  });
});
