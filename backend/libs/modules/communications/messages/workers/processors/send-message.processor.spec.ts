import { MessageStatus } from '@prisma/client';
import { SendMessageProcessor } from './send-message.processor';

describe('SendMessageProcessor', () => {
  const processor = Object.create(SendMessageProcessor.prototype) as SendMessageProcessor;

  it('parses outbound attachments from stored message JSON', () => {
    const readAttachments = (
      processor as unknown as {
        readAttachments: (value: unknown) => Array<{ type: string; url: string }> | undefined;
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
});
