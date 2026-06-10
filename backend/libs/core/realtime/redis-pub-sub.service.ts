import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { attachRedisErrorHandler } from '../redis/redis.options';
import { RedisService } from '../redis/redis.service';

export const REALTIME_CHANNEL_PREFIX = 'business:';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private subscriber: Redis | null = null;
  private readonly handlers = new Map<string, Set<(payload: string) => void>>();

  constructor(private readonly redisService: RedisService) {}

  isAvailable(): boolean {
    return this.redisService.isAvailable();
  }

  private getSubscriber(): Redis | null {
    const client = this.redisService.getClient();
    if (!client) {
      return null;
    }
    if (!this.subscriber) {
      this.subscriber = client.duplicate();
      attachRedisErrorHandler(this.subscriber, () => undefined);
    }
    return this.subscriber;
  }

  businessChannel(businessId: string): string {
    return `${REALTIME_CHANNEL_PREFIX}${businessId}`;
  }

  async publish(
    businessId: string,
    event: string,
    data: unknown,
  ): Promise<void> {
    const channel = this.businessChannel(businessId);
    const message = JSON.stringify({
      event,
      data,
      at: new Date().toISOString(),
    });
    const client = this.redisService.getClient();
    if (!client) return;
    await client.publish(channel, message);
  }

  async subscribe(
    businessId: string,
    handler: (payload: string) => void,
  ): Promise<() => void> {
    const channel = this.businessChannel(businessId);
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      const sub = this.getSubscriber();
      if (!sub) return () => undefined;
      await sub.subscribe(channel);
      sub.on('message', (ch, message) => {
        if (ch !== channel) return;
        const handlers = this.handlers.get(channel);
        handlers?.forEach((h) => {
          try {
            h(message);
          } catch (err) {
            this.logger.error(
              `Realtime handler error: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        });
      });
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
  }
}
