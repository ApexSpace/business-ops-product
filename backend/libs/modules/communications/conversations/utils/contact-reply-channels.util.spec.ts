import { ConversationChannel, ConversationStatus } from '@prisma/client';
import { buildReplyChannelCandidates } from './contact-reply-channels.util';

describe('buildReplyChannelCandidates', () => {
  const contact = {
    id: 'contact-1',
    email: 'user@example.com',
    phoneNumber: '923001234567',
    phoneCountryCode: '+',
    metadata: {
      facebookPsid: 'psid-1',
    },
  } as never;

  it('returns channels with identity or an existing conversation', () => {
    const candidates = buildReplyChannelCandidates(contact, [
      {
        id: 'ig-conv',
        channel: ConversationChannel.INSTAGRAM,
        providerKey: 'instagram',
      } as never,
    ]);

    const channels = candidates.map((row) => row.channel);
    expect(channels).toEqual(
      expect.arrayContaining([
        ConversationChannel.EMAIL,
        ConversationChannel.WHATSAPP,
        ConversationChannel.FACEBOOK,
        ConversationChannel.INSTAGRAM,
      ]),
    );
  });

  it('omits channels without identity or conversation', () => {
    const candidates = buildReplyChannelCandidates(
      {
        id: 'contact-2',
        email: null,
        phoneNumber: null,
        phoneCountryCode: null,
        metadata: {},
      } as never,
      [],
    );

    expect(candidates).toHaveLength(0);
  });

  it('includes email when only an email conversation exists', () => {
    const candidates = buildReplyChannelCandidates(
      {
        id: 'contact-3',
        email: null,
        phoneNumber: null,
        phoneCountryCode: null,
        metadata: {},
      } as never,
      [
        {
          id: 'email-conv',
          channel: ConversationChannel.EMAIL,
          providerKey: 'email',
          status: ConversationStatus.OPEN,
        } as never,
      ],
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.channel).toBe(ConversationChannel.EMAIL);
    expect(candidates[0]?.conversation?.id).toBe('email-conv');
  });
});
