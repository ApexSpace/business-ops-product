import { OutboundMessageDispatchService } from './outbound-message-dispatch.service';

describe('OutboundMessageDispatchService', () => {
  const payload = {
    messageId: 'msg-1',
    businessId: 'biz-1',
    conversationId: 'conv-1',
  };

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('returns after queue enqueue succeeds', async () => {
    const asyncJob = { id: 'job-1' };
    const jobEnqueue = {
      enqueueSendMessage: jest.fn().mockResolvedValue({ asyncJob, queued: true }),
    };
    const sendMessageProcessor = { process: jest.fn() };
    const prisma = { conversationMessage: { findMany: jest.fn() } };

    const service = new OutboundMessageDispatchService(
      jobEnqueue as never,
      sendMessageProcessor as never,
      prisma as never,
    );

    await expect(
      service.dispatch(payload, 'idem-1', 'user-1'),
    ).resolves.toEqual({ asyncJob });
    expect(sendMessageProcessor.process).not.toHaveBeenCalled();
  });

  it('sends inline in development when queue enqueue fails', async () => {
    process.env.NODE_ENV = 'development';
    const asyncJob = { id: 'job-1' };
    const jobEnqueue = {
      enqueueSendMessage: jest.fn().mockResolvedValue({ asyncJob, queued: false }),
    };
    const sendMessageProcessor = {
      process: jest.fn().mockResolvedValue(undefined),
    };
    const prisma = { conversationMessage: { findMany: jest.fn() } };

    const service = new OutboundMessageDispatchService(
      jobEnqueue as never,
      sendMessageProcessor as never,
      prisma as never,
    );

    await expect(
      service.dispatch(payload, 'idem-1', 'user-1'),
    ).resolves.toEqual({ asyncJob });
    expect(sendMessageProcessor.process).toHaveBeenCalledWith({
      messageId: 'msg-1',
      businessId: 'biz-1',
      asyncJobId: 'job-1',
    });
  });
});
