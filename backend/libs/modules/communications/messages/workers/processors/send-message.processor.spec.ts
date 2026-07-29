import { MessageStatus } from '@prisma/client';
import { SendMessageProcessor } from './send-message.processor';

describe('SendMessageProcessor', () => {
  const processor = Object.create(
    SendMessageProcessor.prototype,
  ) as SendMessageProcessor;

  it('parses outbound attachments from stored message JSON', () => {
    const readAttachments = (
      processor as unknown as {
        readAttachments: (
          value: unknown,
        ) => Array<{ type: string; url: string }> | undefined;
      }
    ).readAttachments.bind(processor);

    expect(
      readAttachments([
        { type: 'image', url: 'https://example.com/a.jpg' },
        { type: 'file', url: '' },
      ]),
    ).toEqual([{ type: 'image', url: 'https://example.com/a.jpg' }]);
  });

  it('exposes failed status enum for outbound failure handling', () => {
    expect(MessageStatus.FAILED).toBe('FAILED');
  });

  it('releases send-message claim when failMessage runs', async () => {
    const messagesRepository = { update: jest.fn().mockResolvedValue({}) };
    const asyncJobRepository = {
      markFailed: jest.fn().mockResolvedValue({}),
    };
    const idempotencyService = {
      release: jest.fn().mockResolvedValue(undefined),
    };

    Object.assign(processor, {
      messagesRepository,
      asyncJobRepository,
      idempotencyService,
    });

    const failMessage = (
      processor as unknown as {
        failMessage: (
          payload: {
            messageId: string;
            businessId: string;
            asyncJobId: string;
          },
          messageId: string,
          errorMessage: string,
        ) => Promise<void>;
      }
    ).failMessage.bind(processor);

    await failMessage(
      {
        messageId: 'msg-1',
        businessId: 'biz-1',
        asyncJobId: 'job-1',
      },
      'msg-1',
      'Provider timeout',
    );

    expect(messagesRepository.update).toHaveBeenCalledWith('msg-1', {
      status: MessageStatus.FAILED,
      errorMessage: 'Provider timeout',
    });
    expect(asyncJobRepository.markFailed).toHaveBeenCalledWith(
      'job-1',
      'Provider timeout',
    );
    expect(idempotencyService.release).toHaveBeenCalledWith(
      'send-message:msg-1',
      'msg-1',
    );
  });
});
