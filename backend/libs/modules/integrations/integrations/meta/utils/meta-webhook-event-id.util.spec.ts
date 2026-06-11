import { extractMetaWebhookEventId } from './meta-webhook-event-id.util';

describe('extractMetaWebhookEventId', () => {
  it('uses Facebook message mid', () => {
    const id = extractMetaWebhookEventId({
      object: 'page',
      entry: [
        {
          id: 'page-1',
          messaging: [{ message: { mid: 'm_mid_123' } }],
        },
      ],
    });
    expect(id).toBe('m_mid_123');
  });

  it('uses WhatsApp inbound message id', () => {
    const id = extractMetaWebhookEventId({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-1',
          changes: [
            {
              field: 'messages',
              value: {
                messages: [{ id: 'wamid.ABC123', from: '15551234567' }],
              },
            },
          ],
        },
      ],
    });
    expect(id).toBe('wamid.ABC123');
  });

  it('does not use WABA entry id when no message id is present', () => {
    const id = extractMetaWebhookEventId({
      object: 'whatsapp_business_account',
      entry: [{ id: 'waba-1', changes: [] }],
    });
    expect(id).toBeNull();
  });

  it('does not use WhatsApp status id (same wamid as the message)', () => {
    const id = extractMetaWebhookEventId({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-1',
          changes: [
            {
              field: 'messages',
              value: {
                statuses: [{ id: 'wamid.STATUS_ONLY', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    });
    expect(id).toBeNull();
  });
});
