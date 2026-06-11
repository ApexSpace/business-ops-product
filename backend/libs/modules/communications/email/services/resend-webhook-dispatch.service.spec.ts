import { ResendWebhookDispatchService } from './resend-webhook-dispatch.service';

describe('ResendWebhookDispatchService', () => {
  const webhookEventId = 'wh-1';

  it('enqueues for the worker and does not process inline when queue succeeds', async () => {
    const queueService = {
      enqueueResendWebhook: jest.fn().mockResolvedValue('job-1'),
    };
    const redisService = { isAvailable: jest.fn().mockReturnValue(true) };
    const resendWebhookProcessor = {
      process: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ResendWebhookDispatchService(
      queueService as never,
      redisService as never,
      resendWebhookProcessor as never,
    );

    await expect(service.dispatch(webhookEventId)).resolves.toBe(true);
    expect(resendWebhookProcessor.process).not.toHaveBeenCalled();
  });

  it('processes inline when enqueue fails and returns false on processing error', async () => {
    const queueService = {
      enqueueResendWebhook: jest.fn().mockResolvedValue(null),
    };
    const redisService = { isAvailable: jest.fn().mockReturnValue(false) };
    const resendWebhookProcessor = {
      process: jest.fn().mockRejectedValue(new Error('ingest failed')),
    };

    const service = new ResendWebhookDispatchService(
      queueService as never,
      redisService as never,
      resendWebhookProcessor as never,
    );

    await expect(service.dispatch(webhookEventId)).resolves.toBe(false);
    expect(resendWebhookProcessor.process).toHaveBeenCalledWith({ webhookEventId });
  });

  it('processes inline when enqueue fails and returns true on success', async () => {
    const queueService = {
      enqueueResendWebhook: jest.fn().mockResolvedValue(null),
    };
    const redisService = { isAvailable: jest.fn().mockReturnValue(false) };
    const resendWebhookProcessor = {
      process: jest.fn().mockResolvedValue(undefined),
    };

    const service = new ResendWebhookDispatchService(
      queueService as never,
      redisService as never,
      resendWebhookProcessor as never,
    );

    await expect(service.dispatch(webhookEventId)).resolves.toBe(true);
    expect(resendWebhookProcessor.process).toHaveBeenCalledWith({ webhookEventId });
  });
});
