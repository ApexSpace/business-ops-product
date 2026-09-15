import { ConversationChannel } from '@prisma/client';
import {
  buildInboundContactIdentity,
  normalizeContactEmail,
  parseWhatsAppWaIdToPhone,
  resolveChannelMetadataKey,
} from './contact-channel-identity.util';

describe('contact-channel-identity.util', () => {
  it('resolves metadata keys per channel', () => {
    expect(resolveChannelMetadataKey(ConversationChannel.FACEBOOK)).toBe(
      'facebookPsid',
    );
    expect(resolveChannelMetadataKey(ConversationChannel.WHATSAPP)).toBe(
      'whatsappWaId',
    );
    expect(resolveChannelMetadataKey(ConversationChannel.EMAIL)).toBe(
      'emailAddress',
    );
    expect(resolveChannelMetadataKey(ConversationChannel.INSTAGRAM)).toBe(
      'instagramUserId',
    );
  });

  it('normalizes email addresses', () => {
    expect(normalizeContactEmail('  User@Example.COM ')).toBe(
      'user@example.com',
    );
    expect(normalizeContactEmail('')).toBeNull();
  });

  it('parses WhatsApp wa_id into phone fields', () => {
    const parsed = parseWhatsAppWaIdToPhone('923001234567');
    expect(parsed.phoneKey).toBe('+923001234567');
    expect(parsed.phoneFields.phoneNumber).toBe('923001234567');
  });

  it('builds identity from email inbound', () => {
    const identity = buildInboundContactIdentity(
      {
        channel: ConversationChannel.EMAIL,
        providerKey: 'email',
        externalResourceId: 'biz',
        externalConversationId: 'conv',
        externalParticipantId: 'Customer@Mail.com',
        externalPageId: null,
        externalMessageId: 'm1',
        externalSenderId: 'Customer@Mail.com',
        externalRecipientId: 'reply',
        text: 'hi',
        attachments: null,
        timestamp: new Date(),
        senderName: 'Customer',
        senderProfilePictureUrl: null,
      },
      {},
    );

    expect(identity.email).toBe('customer@mail.com');
    expect(identity.phoneKey).toBeNull();
  });

  it('builds identity from WhatsApp inbound with profile email ignored', () => {
    const identity = buildInboundContactIdentity(
      {
        channel: ConversationChannel.WHATSAPP,
        providerKey: 'whatsapp',
        externalResourceId: 'phone-id',
        externalConversationId: 'wa:phone:923',
        externalParticipantId: '923001234567',
        externalPageId: null,
        externalMessageId: 'wamid.1',
        externalSenderId: '923001234567',
        externalRecipientId: 'phone-id',
        text: 'hello',
        attachments: null,
        timestamp: new Date(),
        senderName: 'Shahbaz',
        senderProfilePictureUrl: null,
      },
      { email: 'should-not-apply@example.com' },
    );

    expect(identity.email).toBeNull();
    expect(identity.phoneKey).toBe('+923001234567');
  });
});
