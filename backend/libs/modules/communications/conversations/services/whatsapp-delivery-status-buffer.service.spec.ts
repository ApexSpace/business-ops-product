import { WhatsAppDeliveryStatusBufferService } from './whatsapp-delivery-status-buffer.service';

describe('WhatsAppDeliveryStatusBufferService', () => {
  const status = {
    externalMessageId: 'wamid.test',
    status: 'read' as const,
    timestamp: new Date('2026-01-01T00:00:01.000Z'),
    recipientId: '923001234567',
    errorMessage: null,
  };

  it('buffers and replays statuses in timestamp order from memory', async () => {
    const redisService = { isAvailable: () => false, getClient: () => null };
    const service = new WhatsAppDeliveryStatusBufferService(redisService as never);

    await service.buffer({
      ...status,
      status: 'delivered',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
    });
    await service.buffer(status);

    const replayed = await service.takeAll('wamid.test');
    expect(replayed).toHaveLength(2);
    expect(replayed[0]?.status).toBe('delivered');
    expect(replayed[1]?.status).toBe('read');

    expect(await service.takeAll('wamid.test')).toEqual([]);
  });
});
