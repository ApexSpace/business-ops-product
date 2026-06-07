import { EmailMessageStatus } from '@prisma/client';
import { EmailNotificationService } from './email-notification.service';
import { EmailTemplateRendererService } from './email-template-renderer.service';

describe('EmailNotificationService', () => {
  const emailConfig = {
    enabled: true,
    defaultFrom: 'Test <no-reply@example.com>',
    defaultReplyTo: null,
    resend: { apiKey: 're_test', webhookSecret: null },
    queue: { concurrency: 10, jobAttempts: 5, jobBackoffMs: 2000 },
  };

  function createService(overrides?: {
    preferenceEnabled?: boolean;
    existingMessage?: { id: string; status: EmailMessageStatus } | null;
    enqueueResult?: string | null;
    enqueueThrows?: boolean;
  }) {
    const configService = {
      get: jest.fn((key: string) => (key === 'email' ? emailConfig : undefined)),
    };
    const preferenceRepository = {
      findByBusinessAndType: jest.fn().mockResolvedValue(
        overrides?.preferenceEnabled === false
          ? { enabled: false }
          : null,
      ),
    };
    const templateRepository = {
      findByBusinessAndType: jest.fn().mockResolvedValue(null),
    };
    const messageRepository = {
      findExistingForSend: jest
        .fn()
        .mockResolvedValue(overrides?.existingMessage ?? null),
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      findById: jest.fn().mockResolvedValue({ id: 'msg-1', status: EmailMessageStatus.QUEUED }),
      updateStatus: jest.fn().mockResolvedValue({}),
    };
    const renderer = new EmailTemplateRendererService();
    const queueService = {
      enqueueSendEmail: overrides?.enqueueThrows
        ? jest.fn().mockRejectedValue(new Error('Redis connection refused'))
        : jest.fn().mockResolvedValue(
            overrides && 'enqueueResult' in overrides
              ? overrides.enqueueResult
              : 'job-1',
          ),
    };

    const service = new EmailNotificationService(
      configService as never,
      preferenceRepository as never,
      templateRepository as never,
      messageRepository as never,
      renderer,
      queueService as never,
    );

    return {
      service,
      messageRepository,
      queueService,
      preferenceRepository,
    };
  }

  const baseParams = {
    businessId: 'biz-1',
    emailType: 'membership.invite',
    toEmail: 'user@example.com',
    entityType: 'Membership',
    entityId: 'mem-1',
    idempotencyKey: 'membership-invite-mem-1',
    variables: {
      'invitee.email': 'user@example.com',
      'inviter.name': 'Alex',
      'business.name': 'Acme',
      invite_link: 'https://example.com/invite',
    },
  };

  it('skips when email preference is disabled', async () => {
    const { service, messageRepository, queueService } = createService({
      preferenceEnabled: false,
    });

    await service.enqueueTransactionalEmail(baseParams);

    expect(messageRepository.create).not.toHaveBeenCalled();
    expect(queueService.enqueueSendEmail).not.toHaveBeenCalled();
  });

  it('skips duplicate enqueue when a non-failed message already exists', async () => {
    const { service, messageRepository, queueService } = createService({
      existingMessage: { id: 'existing-1', status: EmailMessageStatus.SENT },
    });

    await service.enqueueTransactionalEmail(baseParams);

    expect(messageRepository.create).not.toHaveBeenCalled();
    expect(queueService.enqueueSendEmail).not.toHaveBeenCalled();
  });

  it('creates message and enqueues with idempotency key', async () => {
    const { service, messageRepository, queueService } = createService();

    await service.enqueueTransactionalEmail(baseParams);

    expect(messageRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          idempotencyKey: 'membership-invite-mem-1',
        }),
      }),
    );
    expect(queueService.enqueueSendEmail).toHaveBeenCalledWith(
      { emailMessageId: 'msg-1' },
      'membership-invite-mem-1',
    );
  });

  it('marks message FAILED when enqueue fails', async () => {
    const { service, messageRepository } = createService({
      enqueueResult: null,
    });

    await service.enqueueTransactionalEmail(baseParams);

    expect(messageRepository.updateStatus).toHaveBeenCalledWith('msg-1', {
      status: EmailMessageStatus.FAILED,
      errorMessage: 'Failed to enqueue email job: queue unavailable',
    });
  });

  it('marks message FAILED when enqueue throws', async () => {
    const { service, messageRepository } = createService({
      enqueueThrows: true,
    });

    await service.enqueueTransactionalEmail(baseParams);

    expect(messageRepository.updateStatus).toHaveBeenCalledWith('msg-1', {
      status: EmailMessageStatus.FAILED,
      errorMessage: 'Redis connection refused',
    });
  });

  it('skips business preference checks for system auth emails', async () => {
    const { service, messageRepository, preferenceRepository } = createService({
      preferenceEnabled: false,
    });

    await service.enqueueTransactionalEmail({
      businessId: null,
      emailType: 'auth.password_reset',
      toEmail: 'user@example.com',
      userId: 'user-1',
      entityType: 'User',
      entityId: 'user-1',
      idempotencyKey: 'password-reset-user-1',
      variables: {
        'user.name': 'Alex',
        'user.email': 'user@example.com',
        reset_link: 'https://example.com/reset',
      },
    });

    expect(preferenceRepository.findByBusinessAndType).not.toHaveBeenCalled();
    expect(messageRepository.create).toHaveBeenCalled();
  });
});
