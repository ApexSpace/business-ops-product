import { createHmac } from 'crypto';
import { WebhookEventStatus } from '@prisma/client';
import { MetaWebhookService } from './meta-webhook.service';

const APP_SECRET = 'meta_test_secret';

function signBody(body: Buffer): string {
  const digest = createHmac('sha256', APP_SECRET).update(body).digest('hex');
  return `sha256=${digest}`;
}

describe('MetaWebhookService', () => {
  const samplePayload = {
    object: 'page',
    entry: [
      {
        id: 'page_123',
        messaging: [{ message: { mid: 'mid_duplicate_1' } }],
      },
    ],
  };

  function createService(overrides?: {
    existingWebhook?: { id: string; status: WebhookEventStatus } | null;
    createError?: Error | null;
    duplicateAfterRace?: { id: string; status: WebhookEventStatus } | null;
    enqueueResult?: string | null;
  }) {
    const metaConfigService = {
      getMetaAppConfig: jest.fn().mockReturnValue({ appSecret: APP_SECRET }),
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const findByProviderAndExternalId = jest
      .fn()
      .mockResolvedValue(overrides?.existingWebhook ?? null);

    if (overrides?.duplicateAfterRace) {
      findByProviderAndExternalId
        .mockResolvedValueOnce(overrides.existingWebhook ?? null)
        .mockResolvedValueOnce(overrides.duplicateAfterRace);
    }

    const webhookEventsRepository = {
      findByProviderAndExternalId,
      create: overrides?.createError
        ? jest.fn().mockRejectedValue(overrides.createError)
        : jest.fn().mockResolvedValue({ id: 'wh-new' }),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    const queueService = {
      enqueueMetaWebhook: jest
        .fn()
        .mockResolvedValue(
          overrides && 'enqueueResult' in overrides
            ? overrides.enqueueResult
            : 'job-1',
        ),
    };

    const service = new MetaWebhookService(
      metaConfigService as never,
      auditService as never,
      webhookEventsRepository as never,
      queueService as never,
    );

    return {
      service,
      webhookEventsRepository,
      queueService,
      auditService,
    };
  }

  it('persists and enqueues on valid webhook', async () => {
    const body = Buffer.from(JSON.stringify(samplePayload));
    const { service, webhookEventsRepository, queueService } = createService();

    await service.handleEvent(body, signBody(body));

    expect(webhookEventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        externalEventId: 'mid_duplicate_1',
        eventType: 'page',
      }),
    );
    expect(queueService.enqueueMetaWebhook).toHaveBeenCalledWith({
      webhookEventId: 'wh-new',
    });
  });

  it('skips create when webhook already processed', async () => {
    const body = Buffer.from(JSON.stringify(samplePayload));
    const { service, webhookEventsRepository, queueService } = createService({
      existingWebhook: {
        id: 'wh-existing',
        status: WebhookEventStatus.PROCESSED,
      },
    });

    await service.handleEvent(body, signBody(body));

    expect(webhookEventsRepository.create).not.toHaveBeenCalled();
    expect(queueService.enqueueMetaWebhook).not.toHaveBeenCalled();
  });

  it('reuses RECEIVED webhook and re-enqueues', async () => {
    const body = Buffer.from(JSON.stringify(samplePayload));
    const { service, webhookEventsRepository, queueService } = createService({
      existingWebhook: {
        id: 'wh-existing',
        status: WebhookEventStatus.RECEIVED,
      },
    });

    await service.handleEvent(body, signBody(body));

    expect(webhookEventsRepository.create).not.toHaveBeenCalled();
    expect(queueService.enqueueMetaWebhook).toHaveBeenCalledWith({
      webhookEventId: 'wh-existing',
    });
  });

  it('handles concurrent duplicate create (P2002) without throwing', async () => {
    const body = Buffer.from(JSON.stringify(samplePayload));
    const p2002 = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    const { service, webhookEventsRepository, queueService } = createService({
      createError: p2002,
      duplicateAfterRace: {
        id: 'wh-race',
        status: WebhookEventStatus.RECEIVED,
      },
    });

    await expect(
      service.handleEvent(body, signBody(body)),
    ).resolves.toBeUndefined();

    expect(webhookEventsRepository.create).toHaveBeenCalled();
    expect(queueService.enqueueMetaWebhook).toHaveBeenCalledWith({
      webhookEventId: 'wh-race',
    });
  });

  it('returns early when P2002 race resolves to processed duplicate', async () => {
    const body = Buffer.from(JSON.stringify(samplePayload));
    const p2002 = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    const { service, webhookEventsRepository, queueService } = createService({
      createError: p2002,
      duplicateAfterRace: {
        id: 'wh-race',
        status: WebhookEventStatus.PROCESSED,
      },
    });

    await service.handleEvent(body, signBody(body));

    expect(webhookEventsRepository.create).toHaveBeenCalled();
    expect(queueService.enqueueMetaWebhook).not.toHaveBeenCalled();
  });
});
