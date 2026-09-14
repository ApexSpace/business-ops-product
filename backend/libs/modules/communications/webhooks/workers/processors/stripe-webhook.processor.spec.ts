import { WebhookEventStatus } from '@prisma/client';
import { StripeWebhookProcessor } from './stripe-webhook.processor';

describe('StripeWebhookProcessor (SALE-AUD-01)', () => {
  const eventId = 'we_1';
  const externalEventId = 'evt_1';
  const payload = {
    webhookEventId: eventId,
    source: 'connected' as const,
  };

  function createProcessor(options?: {
    status?: WebhookEventStatus;
    claimSequence?: boolean[];
    dispatchThrows?: Error;
  }) {
    const status = options?.status ?? WebhookEventStatus.RECEIVED;
    const event = {
      id: eventId,
      externalEventId,
      status,
      payload: { id: externalEventId, type: 'payment_intent.succeeded' },
    };

    const webhookEventsRepository = {
      findById: jest.fn().mockResolvedValue(event),
      updateStatus: jest.fn().mockResolvedValue({}),
    };
    const stripeWebhookDispatch = {
      dispatchStoredEvent: options?.dispatchThrows
        ? jest.fn().mockRejectedValue(options.dispatchThrows)
        : jest.fn().mockResolvedValue(undefined),
    };
    const claimSequence = [...(options?.claimSequence ?? [true])];
    const idempotencyService = {
      claim: jest.fn().mockImplementation(async () => {
        if (claimSequence.length === 0) return false;
        return claimSequence.shift()!;
      }),
      release: jest.fn().mockResolvedValue(undefined),
    };

    const processor = new StripeWebhookProcessor(
      webhookEventsRepository as never,
      stripeWebhookDispatch as never,
      idempotencyService as never,
    );

    return {
      processor,
      webhookEventsRepository,
      stripeWebhookDispatch,
      idempotencyService,
      event,
    };
  }

  it('dispatches once and marks PROCESSED on success', async () => {
    const {
      processor,
      stripeWebhookDispatch,
      webhookEventsRepository,
      idempotencyService,
    } = createProcessor();

    await processor.process(payload);

    expect(stripeWebhookDispatch.dispatchStoredEvent).toHaveBeenCalledWith(
      eventId,
      'connected',
    );
    expect(webhookEventsRepository.updateStatus).toHaveBeenCalledWith(
      eventId,
      WebhookEventStatus.PROCESSED,
    );
    expect(idempotencyService.release).not.toHaveBeenCalled();
  });

  it('is idempotent when the row is already PROCESSED', async () => {
    const { processor, stripeWebhookDispatch, idempotencyService } =
      createProcessor({
        status: WebhookEventStatus.PROCESSED,
      });

    await processor.process(payload);

    expect(idempotencyService.claim).not.toHaveBeenCalled();
    expect(stripeWebhookDispatch.dispatchStoredEvent).not.toHaveBeenCalled();
  });

  it('is idempotent when claim-miss finds PROCESSED (duplicate delivery)', async () => {
    const { processor, stripeWebhookDispatch, webhookEventsRepository } =
      createProcessor({
        status: WebhookEventStatus.RECEIVED,
        claimSequence: [false],
      });
    webhookEventsRepository.findById
      .mockResolvedValueOnce({
        id: eventId,
        externalEventId,
        status: WebhookEventStatus.RECEIVED,
      })
      .mockResolvedValueOnce({
        id: eventId,
        externalEventId,
        status: WebhookEventStatus.PROCESSED,
      });

    await processor.process(payload);

    expect(stripeWebhookDispatch.dispatchStoredEvent).not.toHaveBeenCalled();
  });

  it('releases the claim and marks FAILED so retries can reprocess', async () => {
    const {
      processor,
      webhookEventsRepository,
      stripeWebhookDispatch,
      idempotencyService,
    } = createProcessor({
      dispatchThrows: new Error('settlement blip'),
    });

    await expect(processor.process(payload)).rejects.toThrow('settlement blip');

    expect(idempotencyService.release).toHaveBeenCalledWith(
      'stripe-webhook',
      externalEventId,
    );
    expect(webhookEventsRepository.updateStatus).toHaveBeenCalledWith(
      eventId,
      WebhookEventStatus.FAILED,
      'settlement blip',
    );
    expect(stripeWebhookDispatch.dispatchStoredEvent).toHaveBeenCalledTimes(1);
  });

  it('reprocesses FAILED events after a leftover claim (fail → retry)', async () => {
    const failedEvent = {
      id: eventId,
      externalEventId,
      status: WebhookEventStatus.FAILED,
    };
    const webhookEventsRepository = {
      findById: jest.fn().mockResolvedValue(failedEvent),
      updateStatus: jest.fn().mockResolvedValue({}),
    };
    const stripeWebhookDispatch = {
      dispatchStoredEvent: jest.fn().mockResolvedValue(undefined),
    };
    const idempotencyService = {
      claim: jest
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new StripeWebhookProcessor(
      webhookEventsRepository as never,
      stripeWebhookDispatch as never,
      idempotencyService as never,
    );

    await processor.process(payload);

    expect(idempotencyService.release).toHaveBeenCalledWith(
      'stripe-webhook',
      externalEventId,
    );
    expect(idempotencyService.claim).toHaveBeenCalledTimes(2);
    expect(stripeWebhookDispatch.dispatchStoredEvent).toHaveBeenCalledWith(
      eventId,
      'connected',
    );
    expect(webhookEventsRepository.updateStatus).toHaveBeenCalledWith(
      eventId,
      WebhookEventStatus.PROCESSED,
    );
  });

  it('fail then retry actually reprocesses on the same worker', async () => {
    const event = {
      id: eventId,
      externalEventId,
      status: WebhookEventStatus.RECEIVED as WebhookEventStatus,
    };
    const webhookEventsRepository = {
      findById: jest.fn().mockImplementation(async () => event),
      updateStatus: jest.fn().mockImplementation(async (_id, status) => {
        event.status = status;
      }),
    };
    const stripeWebhookDispatch = {
      dispatchStoredEvent: jest
        .fn()
        .mockRejectedValueOnce(new Error('settlement blip'))
        .mockResolvedValueOnce(undefined),
    };
    const idempotencyService = {
      claim: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new StripeWebhookProcessor(
      webhookEventsRepository as never,
      stripeWebhookDispatch as never,
      idempotencyService as never,
    );

    await expect(processor.process(payload)).rejects.toThrow('settlement blip');
    expect(event.status).toBe(WebhookEventStatus.FAILED);
    expect(idempotencyService.release).toHaveBeenCalledTimes(1);

    await processor.process(payload);

    expect(stripeWebhookDispatch.dispatchStoredEvent).toHaveBeenCalledTimes(2);
    expect(event.status).toBe(WebhookEventStatus.PROCESSED);
  });
});
