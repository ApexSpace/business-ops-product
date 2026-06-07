import { EmailMessageStatus, WebhookEventStatus } from '@prisma/client';
import { ResendWebhookService } from './resend-webhook.service';

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-06-06T12:00:00Z',
      data: { email_id: 're_email_1' },
    }),
  })),
}));

describe('ResendWebhookService', () => {
  const emailConfig = {
    enabled: true,
    defaultFrom: 'Test <no-reply@example.com>',
    defaultReplyTo: null,
    resend: { apiKey: 're_test', webhookSecret: 'whsec_test' },
    queue: { concurrency: 10, jobAttempts: 5, jobBackoffMs: 2000 },
  };

  function createService(overrides?: {
    existingWebhook?: { id: string; status: WebhookEventStatus } | null;
    enqueueResult?: string | null;
    emailMessage?: Record<string, unknown> | null;
  }) {
    const configService = {
      get: jest.fn((key: string, opts?: { infer?: boolean }) => {
        if (key === 'email.resend.webhookSecret' && opts?.infer) {
          return emailConfig.resend.webhookSecret;
        }
        if (key === 'email') {
          return emailConfig;
        }
        return undefined;
      }),
    };
    const webhookEventsRepository = {
      findByProviderAndExternalId: jest
        .fn()
        .mockResolvedValue(overrides?.existingWebhook ?? null),
      create: jest.fn().mockResolvedValue({ id: 'wh-1' }),
      findById: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue({}),
    };
    const messageRepository = {
      findByProviderMessageId: jest
        .fn()
        .mockResolvedValue(overrides?.emailMessage ?? null),
      updateStatus: jest.fn().mockResolvedValue({}),
      mergeMetadata: jest.fn().mockResolvedValue({}),
    };
    const queueService = {
      enqueueResendWebhook: jest.fn().mockResolvedValue(
        overrides && 'enqueueResult' in overrides
          ? overrides.enqueueResult
          : 'job-1',
      ),
    };

    const service = new ResendWebhookService(
      configService as never,
      webhookEventsRepository as never,
      messageRepository as never,
      queueService as never,
    );

    return {
      service,
      webhookEventsRepository,
      messageRepository,
      queueService,
    };
  }

  const validHeaders = {
    'svix-id': 'msg_delivery_1',
    'svix-timestamp': '1717670400',
    'svix-signature': 'v1,signature',
  };

  it('rejects invalid signature headers with 400', async () => {
    const { service } = createService();

    await expect(
      service.handleWebhook(Buffer.from('{}'), {}),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('persists and enqueues on valid webhook', async () => {
    const { service, webhookEventsRepository, queueService } = createService();

    await service.handleWebhook(Buffer.from('{}'), validHeaders);

    expect(webhookEventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        externalEventId: 'msg_delivery_1',
        eventType: 'email.delivered',
      }),
    );
    expect(queueService.enqueueResendWebhook).toHaveBeenCalledWith({
      webhookEventId: 'wh-1',
    });
  });

  it('skips create when webhook already processed', async () => {
    const { service, webhookEventsRepository } = createService({
      existingWebhook: { id: 'wh-existing', status: WebhookEventStatus.PROCESSED },
    });

    await service.handleWebhook(Buffer.from('{}'), validHeaders);

    expect(webhookEventsRepository.create).not.toHaveBeenCalled();
  });

  it('reuses RECEIVED webhook and re-enqueues', async () => {
    const { service, webhookEventsRepository, queueService } = createService({
      existingWebhook: { id: 'wh-existing', status: WebhookEventStatus.RECEIVED },
    });

    await service.handleWebhook(Buffer.from('{}'), validHeaders);

    expect(webhookEventsRepository.create).not.toHaveBeenCalled();
    expect(queueService.enqueueResendWebhook).toHaveBeenCalledWith({
      webhookEventId: 'wh-existing',
    });
  });

  it('throws when enqueue fails so Resend retries', async () => {
    const { service } = createService({ enqueueResult: null });

    await expect(
      service.handleWebhook(Buffer.from('{}'), validHeaders),
    ).rejects.toMatchObject({ status: 500 });
  });

  it('maps email.failed to FAILED status', async () => {
    const { service, messageRepository, webhookEventsRepository } = createService({
      emailMessage: {
        id: 'em-1',
        status: EmailMessageStatus.SENT,
        sentAt: new Date(),
        errorMessage: null,
        metadata: {},
      },
    });

    webhookEventsRepository.findById.mockResolvedValue({
      id: 'wh-1',
      status: WebhookEventStatus.RECEIVED,
      payload: {
        type: 'email.failed',
        data: { email_id: 're_email_1', failed: { reason: 'Provider error' } },
      },
    });

    await service.processQueuedEvent({ webhookEventId: 'wh-1' });

    expect(messageRepository.updateStatus).toHaveBeenCalledWith('em-1', {
      status: EmailMessageStatus.FAILED,
      errorMessage: 'Provider error',
      sentAt: expect.any(Date),
      metadataPatch: {},
    });
  });

  it('records delivery_delayed in metadata without status change', async () => {
    const { service, messageRepository, webhookEventsRepository } = createService({
      emailMessage: {
        id: 'em-1',
        status: EmailMessageStatus.SENT,
        sentAt: new Date(),
        errorMessage: null,
        metadata: {},
      },
    });

    webhookEventsRepository.findById.mockResolvedValue({
      id: 'wh-1',
      status: WebhookEventStatus.RECEIVED,
      payload: {
        type: 'email.delivery_delayed',
        data: { email_id: 're_email_1' },
      },
    });

    await service.processQueuedEvent({ webhookEventId: 'wh-1' });

    expect(messageRepository.mergeMetadata).toHaveBeenCalledWith('em-1', {
      deliveryDelayed: true,
      resendEventType: 'email.delivery_delayed',
    });
    expect(messageRepository.updateStatus).not.toHaveBeenCalled();
  });
});
