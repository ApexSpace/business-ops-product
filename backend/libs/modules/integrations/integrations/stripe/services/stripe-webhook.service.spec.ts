import { Prisma, WebhookEventProvider, WebhookEventStatus } from '@prisma/client';
import { StripeWebhookService } from './stripe-webhook.service';

describe('StripeWebhookService ingress dedup', () => {
  const webhookEventsRepository = {
    findByProviderAndExternalId: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };
  const jobEnqueue = { enqueueStripeWebhook: jest.fn() };
  const stripeApiService = {
    getPlatformWebhookSecret: () => 'whsec_test',
    constructWebhookEvent: jest.fn(),
  };

  const service = new StripeWebhookService(
    stripeApiService as never,
    {} as never,
    {} as never,
    { log: jest.fn() } as never,
    webhookEventsRepository as never,
    jobEnqueue as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    stripeApiService.constructWebhookEvent.mockReturnValue({
      id: 'evt_dup',
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: {} },
    });
  });

  it('resumes RECEIVED events on duplicate delivery', async () => {
    webhookEventsRepository.findByProviderAndExternalId.mockResolvedValue({
      id: 'we_1',
      status: WebhookEventStatus.RECEIVED,
    });
    webhookEventsRepository.findById.mockResolvedValue({
      id: 'we_1',
      status: WebhookEventStatus.RECEIVED,
    });

    await service.handlePlatformWebhook(Buffer.from('{}'), 'sig');

    expect(jobEnqueue.enqueueStripeWebhook).toHaveBeenCalledWith({
      webhookEventId: 'we_1',
      source: 'platform',
    });
    expect(webhookEventsRepository.create).not.toHaveBeenCalled();
  });

  it('handles P2002 race by resuming existing row', async () => {
    webhookEventsRepository.findByProviderAndExternalId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'we_2', status: WebhookEventStatus.FAILED });

    webhookEventsRepository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    webhookEventsRepository.findById.mockResolvedValue({
      id: 'we_2',
      status: WebhookEventStatus.FAILED,
    });

    await service.handlePlatformWebhook(Buffer.from('{}'), 'sig');

    expect(jobEnqueue.enqueueStripeWebhook).toHaveBeenCalledWith({
      webhookEventId: 'we_2',
      source: 'platform',
    });
  });
});
