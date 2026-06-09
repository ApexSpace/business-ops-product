import { ConversationChannel } from '@prisma/client';
import { normalizeMetaWebhookPayload } from './meta-inbound-normalizer';

describe('normalizeMetaWebhookPayload', () => {
  it('normalizes Facebook page messaging', () => {
    const { messages, objectType } = normalizeMetaWebhookPayload({
      object: 'page',
      entry: [
        {
          id: 'PAGE_123',
          messaging: [
            {
              sender: { id: 'USER_PSID' },
              recipient: { id: 'PAGE_123' },
              timestamp: 1_700_000_000,
              message: { mid: 'm_mid_1', text: 'Hello' },
            },
          ],
        },
      ],
    });

    expect(objectType).toBe('page');
    expect(messages).toHaveLength(1);
    expect(messages[0].channel).toBe(ConversationChannel.FACEBOOK);
    expect(messages[0].externalMessageId).toBe('m_mid_1');
    expect(messages[0].externalParticipantId).toBe('USER_PSID');
  });

  it('normalizes Instagram messaging', () => {
    const { messages } = normalizeMetaWebhookPayload({
      object: 'instagram',
      entry: [
        {
          id: 'IG_456',
          messaging: [
            {
              sender: { id: 'IG_USER' },
              recipient: { id: 'IG_456' },
              timestamp: 1_700_000_100,
              message: { mid: 'm_mid_2', text: 'Hi' },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].channel).toBe(ConversationChannel.INSTAGRAM);
    expect(messages[0].providerKey).toBe('instagram');
  });

  it('normalizes image attachments with URLs', () => {
    const { messages } = normalizeMetaWebhookPayload({
      object: 'page',
      entry: [
        {
          id: 'PAGE_123',
          messaging: [
            {
              sender: { id: 'USER_PSID' },
              recipient: { id: 'PAGE_123' },
              timestamp: 1_700_000_200,
              message: {
                mid: 'm_mid_img',
                attachments: [
                  {
                    type: 'image',
                    payload: { url: 'https://example.com/photo.jpg' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].attachments).toEqual([
      { type: 'image', url: 'https://example.com/photo.jpg', title: null },
    ]);
  });

  it('normalizes WhatsApp business account messages', () => {
    const { messages, objectType } = normalizeMetaWebhookPayload({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_789',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: 'PHONE_999',
                },
                contacts: [
                  {
                    profile: { name: 'Jane Customer' },
                    wa_id: '15559876543',
                  },
                ],
                messages: [
                  {
                    from: '15559876543',
                    id: 'wamid.abc123',
                    timestamp: '1700000100',
                    type: 'text',
                    text: { body: 'Hi from WhatsApp' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(objectType).toBe('whatsapp_business_account');
    expect(messages).toHaveLength(1);
    expect(messages[0].channel).toBe(ConversationChannel.WHATSAPP);
    expect(messages[0].providerKey).toBe('whatsapp');
    expect(messages[0].externalResourceId).toBe('PHONE_999');
    expect(messages[0].externalParticipantId).toBe('15559876543');
    expect(messages[0].senderName).toBe('Jane Customer');
    expect(messages[0].text).toBe('Hi from WhatsApp');
  });

  it('normalizes WhatsApp image attachments', () => {
    const { messages } = normalizeMetaWebhookPayload({
      object: 'whatsapp',
      entry: [
        {
          id: 'WABA_789',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'PHONE_999' },
                messages: [
                  {
                    from: '15559876543',
                    id: 'wamid.img',
                    timestamp: '1700000200',
                    type: 'image',
                    image: { id: 'media_123', mime_type: 'image/jpeg' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].attachments).toEqual([
      { type: 'image', url: null, title: 'media_123' },
    ]);
  });

  it('ignores echo messages from page', () => {
    const { messages } = normalizeMetaWebhookPayload({
      object: 'page',
      entry: [
        {
          id: 'PAGE_123',
          messaging: [
            {
              sender: { id: 'PAGE_123' },
              recipient: { id: 'USER_PSID' },
              timestamp: 1_700_000_000,
              message: { mid: 'm_echo', text: 'Our reply' },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(0);
  });
});
