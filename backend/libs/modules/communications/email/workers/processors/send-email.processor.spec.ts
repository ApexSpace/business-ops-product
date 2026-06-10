import { EmailMessageStatus } from '@prisma/client';
import { SendEmailProcessor } from './send-email.processor';

describe('SendEmailProcessor', () => {
  function createProcessor(overrides?: {
    message?: Record<string, unknown> | null;
    resendConfigured?: boolean;
    resendResult?: { providerMessageId: string };
    resendThrows?: Error;
  }) {
    const messageRepository = {
      findById: jest.fn().mockResolvedValue(
        overrides?.message ??
          ({
            id: 'msg-1',
            status: EmailMessageStatus.QUEUED,
            fromEmail: 'Test <no-reply@example.com>',
            toEmail: 'user@example.com',
            subject: 'Hello',
            replyTo: null,
            metadata: { htmlBody: '<p>Hi</p>', textBody: 'Hi' },
          } as const),
      ),
      updateStatus: jest.fn().mockResolvedValue({}),
    };
    const resendProvider = {
      isConfigured: jest
        .fn()
        .mockReturnValue(overrides?.resendConfigured ?? true),
      send: overrides?.resendThrows
        ? jest.fn().mockRejectedValue(overrides.resendThrows)
        : jest
            .fn()
            .mockResolvedValue(
              overrides?.resendResult ?? { providerMessageId: 're_123' },
            ),
    };
    const idempotencyService = {
      claim: jest.fn().mockResolvedValue(true),
    };

    const processor = new SendEmailProcessor(
      messageRepository as never,
      resendProvider as never,
      idempotencyService as never,
    );

    return { processor, messageRepository, resendProvider, idempotencyService };
  }

  it('sends via Resend and marks message SENT', async () => {
    const { processor, messageRepository, resendProvider } = createProcessor();

    await processor.process({ emailMessageId: 'msg-1' });

    expect(resendProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Hello',
      }),
    );
    expect(messageRepository.updateStatus).toHaveBeenCalledWith('msg-1', {
      status: EmailMessageStatus.SENT,
      providerMessageId: 're_123',
      sentAt: expect.any(Date),
      errorMessage: null,
    });
  });

  it('marks FAILED when Resend throws', async () => {
    const { processor, messageRepository } = createProcessor({
      resendThrows: new Error('Rate limited'),
    });

    await expect(
      processor.process({ emailMessageId: 'msg-1' }),
    ).rejects.toThrow('Rate limited');

    expect(messageRepository.updateStatus).toHaveBeenCalledWith('msg-1', {
      status: EmailMessageStatus.FAILED,
      errorMessage: 'Rate limited',
    });
  });

  it('skips when idempotency claim fails', async () => {
    const { processor, resendProvider, idempotencyService } = createProcessor();
    idempotencyService.claim.mockResolvedValue(false);

    await processor.process({ emailMessageId: 'msg-1' });

    expect(resendProvider.send).not.toHaveBeenCalled();
  });
});
