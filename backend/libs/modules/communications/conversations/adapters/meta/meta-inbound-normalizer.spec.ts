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
