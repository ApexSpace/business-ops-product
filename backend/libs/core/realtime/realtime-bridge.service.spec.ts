import { RealtimeBridgeService } from './realtime-bridge.service';
import { RedisPubSubService } from './redis-pub-sub.service';

describe('RealtimeBridgeService', () => {
  function createBridge(overrides?: {
    available?: boolean;
    subscribe?: jest.Mock;
  }) {
    const unsubscribe = jest.fn();
    const subscribe =
      overrides?.subscribe ??
      jest.fn().mockResolvedValue(unsubscribe);
    const pubSub = {
      isAvailable: jest.fn().mockReturnValue(overrides?.available ?? true),
      subscribe,
    } as unknown as RedisPubSubService;

    const bridge = new RealtimeBridgeService(pubSub);
    const emit = jest.fn();
    bridge.bindServer({
      to: jest.fn().mockReturnValue({ emit }),
    } as never);

    return { bridge, pubSub, subscribe, unsubscribe, emit };
  }

  it('subscribes to Redis when the first socket acquires a business', async () => {
    const { bridge, subscribe } = createBridge();

    await bridge.acquireBusiness('biz-1');

    expect(subscribe).toHaveBeenCalledWith('biz-1', expect.any(Function));
  });

  it('reference-counts business subscriptions across sockets', async () => {
    const { bridge, subscribe, unsubscribe } = createBridge();

    await bridge.acquireBusiness('biz-1');
    await bridge.acquireBusiness('biz-1');
    bridge.releaseBusiness('biz-1');

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();

    bridge.releaseBusiness('biz-1');
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('emits realtime.disabled when Redis is unavailable', async () => {
    const { bridge, emit, subscribe } = createBridge({ available: false });

    await bridge.acquireBusiness('biz-1');

    expect(subscribe).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      'event',
      expect.objectContaining({
        event: 'realtime.disabled',
        data: { reason: 'redis_unavailable' },
      }),
    );
  });
});
