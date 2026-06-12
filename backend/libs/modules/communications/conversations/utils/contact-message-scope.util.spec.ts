import { ConversationChannel } from '@prisma/client';
import { buildContactMessageScopeWhere } from './contact-message-scope.util';

describe('buildContactMessageScopeWhere', () => {
  it('includes conversations linked by contactId and channel identities', () => {
    const scope = buildContactMessageScopeWhere('biz-1', {
      id: 'contact-1',
      businessId: 'biz-1',
      email: 'user@example.com',
      phoneCountryCode: '+92',
      phoneNumber: '3014863718',
      metadata: { facebookPsid: 'psid-1' },
    } as never);

    expect(scope).toEqual({
      businessId: 'biz-1',
      OR: [
        {
          conversation: {
            businessId: 'biz-1',
            OR: [
              { contactId: 'contact-1', deletedAt: null },
              {
                channel: ConversationChannel.EMAIL,
                externalParticipantId: 'user@example.com',
                deletedAt: null,
              },
              {
                channel: ConversationChannel.WHATSAPP,
                externalParticipantId: '923014863718',
                deletedAt: null,
              },
              {
                channel: ConversationChannel.FACEBOOK,
                externalParticipantId: 'psid-1',
                deletedAt: null,
              },
            ],
          },
        },
        { contactId: 'contact-1' },
      ],
    });
  });
});
