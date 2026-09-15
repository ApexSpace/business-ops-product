import { normalizeResendInboundEmail } from './resend-inbound.normalizer';

describe('normalizeResendInboundEmail', () => {
  const conversationId = '7aef33e5-4167-40a4-a306-a0117a3be644';
  const tenantId = '8902a02c-ad8d-4204-9924-072f0db849a0';
  const inboundDomain = 'notify.codesoltech.com';
  const routingAddress = `7aef33e5416740a4a306a0117a3be6448902a02cad8d42049924072f0db849a0@${inboundDomain}`;

  it('routes compact reply-to addresses from the to field', () => {
    const result = normalizeResendInboundEmail(
      {
        email_id: 'email-1',
        from: 'sender@example.com',
        to: [routingAddress],
        subject: 'Re: hello',
        text: 'alhamdulillah',
      },
      inboundDomain,
    );

    expect(result).toMatchObject({
      externalConversationId: conversationId,
      externalResourceId: tenantId,
      externalParticipantId: 'sender@example.com',
      text: 'alhamdulillah',
    });
  });

  it('parses routing addresses wrapped in display names', () => {
    const result = normalizeResendInboundEmail(
      {
        email_id: 'email-2',
        from: 'Sender <sender@example.com>',
        to: [`Routing <${routingAddress}>`],
        text: 'reply body',
      },
      inboundDomain,
    );

    expect(result).toMatchObject({
      externalConversationId: conversationId,
      externalResourceId: tenantId,
      externalParticipantId: 'sender@example.com',
    });
  });

  it('falls back to delivered-to headers when to is missing routing token', () => {
    const result = normalizeResendInboundEmail(
      {
        email_id: 'email-3',
        from: 'sender@example.com',
        to: ['noreply@example.com'],
        headers: {
          'delivered-to': routingAddress,
        },
        text: 'reply via header',
      },
      inboundDomain,
    );

    expect(result).toMatchObject({
      externalConversationId: conversationId,
      externalResourceId: tenantId,
      text: 'reply via header',
    });
  });

  it('returns null when no routable address is present', () => {
    expect(
      normalizeResendInboundEmail(
        {
          from: 'sender@example.com',
          to: ['support@notify.codesoltech.com'],
          text: 'unroutable',
        },
        inboundDomain,
      ),
    ).toBeNull();
  });
});
