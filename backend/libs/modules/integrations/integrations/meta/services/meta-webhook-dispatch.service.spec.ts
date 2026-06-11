import { MetaWebhookDispatchService } from './meta-webhook-dispatch.service';

describe('MetaWebhookDispatchService', () => {
  const webhookEventId = 'wh-1';

  it('enqueues for the worker and does not process inline when queue succeeds', async () => {
    const queueService = {
      enqueueMetaWebhook: jest.fn().mockResolvedValue('job-1'),
    };
    const redisService = { isAvailable: jest.fn().mockReturnValue(true) };
    const metaWebhookProcessor = {
      process: jest.fn().mockResolvedValue(undefined),
    };

    const service = new MetaWebhookDispatchService(
      queueService as never,
      redisService as never,
      metaWebhookProcessor as never,
    );

    await expect(service.dispatch(webhookEventId)).resolves.toBe(true);
    expect(metaWebhookProcessor.process).not.toHaveBeenCalled();
  });

  it('processes inline when enqueue fails and returns false on processing error', async () => {
    const queueService = {
      enqueueMetaWebhook: jest.fn().mockResolvedValue(null),
    };
    const redisService = { isAvailable: jest.fn().mockReturnValue(false) };
    const metaWebhookProcessor = {
      process: jest.fn().mockRejectedValue(new Error('ingest failed')),
    };

    const service = new MetaWebhookDispatchService(
      queueService as never,
      redisService as never,
      metaWebhookProcessor as never,
    );

    await expect(service.dispatch(webhookEventId)).resolves.toBe(false);
    expect(metaWebhookProcessor.process).toHaveBeenCalledWith({ webhookEventId });
  });

  it('processes inline when enqueue fails and returns true on success', async () => {
    const queueService = {
      enqueueMetaWebhook: jest.fn().mockResolvedValue(null),
    };
    const redisService = { isAvailable: jest.fn().mockReturnValue(false) };
    const metaWebhookProcessor = {
      process: jest.fn().mockResolvedValue(undefined),
    };

    const service = new MetaWebhookDispatchService(
      queueService as never,
      redisService as never,
      metaWebhookProcessor as never,
    );

    await expect(service.dispatch(webhookEventId)).resolves.toBe(true);
    expect(metaWebhookProcessor.process).toHaveBeenCalledWith({ webhookEventId });
  });
});
