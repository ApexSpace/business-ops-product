import {
  buildConversationReplyToAddress,
  normalizeRoutableEmailAddress,
  parseConversationReplyToAddress,
} from './email-reply-to.util';

describe('email-reply-to.util', () => {
  const conversationId = 'c571a92e-4202-4248-8cb3-652098383235';
  const tenantId = '989a6bca-d694-4c6a-a404-ba51abb28db8';
  const domain = 'notify.codesoltech.com';

  it('builds a compact reply-to address within RFC local-part limits', () => {
    const address = buildConversationReplyToAddress(
      conversationId,
      tenantId,
      domain,
    );

    const localPart = address.split('@')[0];
    expect(localPart).toHaveLength(64);
    expect(address).toBe(
      'c571a92e420242488cb3652098383235989a6bcad6944c6aa404ba51abb28db8@notify.codesoltech.com',
    );

    expect(parseConversationReplyToAddress(address)).toEqual({
      conversationId,
      tenantId,
    });
  });

  it('parses legacy conv_ prefixed addresses', () => {
    const legacy = `conv_${conversationId}_${tenantId}@${domain}`;

    expect(parseConversationReplyToAddress(legacy)).toEqual({
      conversationId,
      tenantId,
    });
  });

  it('parses bare compact local parts without a domain', () => {
    const bare =
      'cb5493b6c0654319be7eeaa8d873d35c989a6bcad6944c6aa404ba51abb28db8';

    expect(parseConversationReplyToAddress(bare)).toEqual({
      conversationId: 'cb5493b6-c065-4319-be7e-eaa8d873d35c',
      tenantId: '989a6bca-d694-4c6a-a404-ba51abb28db8',
    });
    expect(normalizeRoutableEmailAddress(bare, domain)).toBe(`${bare}@${domain}`);
  });

  it('returns null for non-conversation addresses', () => {
    expect(parseConversationReplyToAddress('support@notify.codesoltech.com')).toBeNull();
  });
});
