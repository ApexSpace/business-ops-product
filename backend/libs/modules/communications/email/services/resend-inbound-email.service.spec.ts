import { ResendInboundEmailService } from './resend-inbound-email.service';

describe('ResendInboundEmailService', () => {
  const conversationId = 'c571a92e-4202-4248-8cb3-652098383235';
  const tenantId = '989a6bca-d694-4c6a-a404-ba51abb28db8';
  const inboundDomain = 'notify.codesoltech.com';
  const replyTo = `conv_${conversationId}_${tenantId}@${inboundDomain}`;

  it('routes normalized inbound email through shared conversation ingestion', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(inboundDomain),
    };
    const resendProvider = {
      getReceivedEmail: jest.fn().mockResolvedValue({
        from: 'sender@example.com',
        to: [replyTo],
        subject: 'Re: Hello',
        text: 'Reply body',
      }),
    };
    const conversationWebhookIngestion = {
      ingestNormalizedInbound: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ResendInboundEmailService(
      configService as never,
      resendProvider as never,
      conversationWebhookIngestion as never,
    );

    await service.processInboundPayload({
      email_id: 'email-1',
      from: 'Sender <sender@example.com>',
      to: [replyTo],
      subject: 'Re: Hello',
      text: 'Reply body',
    });

    expect(conversationWebhookIngestion.ingestNormalizedInbound).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'EMAIL',
        providerKey: 'email',
        externalConversationId: conversationId,
        externalParticipantId: 'sender@example.com',
        text: 'Reply body',
      }),
    );
  });

  it('ignores payloads without a routable conversation address', async () => {
    const configService = {
      get: jest.fn().mockReturnValue(inboundDomain),
    };
    const resendProvider = {
      getReceivedEmail: jest.fn(),
    };
    const conversationWebhookIngestion = {
      ingestNormalizedInbound: jest.fn(),
    };

    const service = new ResendInboundEmailService(
      configService as never,
      resendProvider as never,
      conversationWebhookIngestion as never,
    );

    await service.processInboundPayload({
      email_id: 'email-2',
      from: 'sender@example.com',
      to: ['noreply@example.com'],
      text: 'No routing token',
    });

    expect(conversationWebhookIngestion.ingestNormalizedInbound).not.toHaveBeenCalled();
  });
});
