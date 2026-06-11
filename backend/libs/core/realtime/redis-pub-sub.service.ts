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

  private resetSubscriber(): void {
    if (this.subscriber) {
      void this.subscriber.quit().catch(() => undefined);
      this.subscriber = null;
    }
  }

  private async getSubscriber(): Promise<Redis | null> {
    const client = this.redisService.getClient();
    if (!client) {
      return null;
    }

    if (this.subscriber && this.subscriber.status === 'ready') {
      return this.subscriber;
    }

    this.resetSubscriber();

    const sub = client.duplicate();
    attachRedisErrorHandler(sub, (err) => {
      this.logger.warn(
        `Redis subscriber connection error: ${err.message}`,
      );
      this.resetSubscriber();
    });

    try {
      if (sub.status === 'wait') {
        await sub.connect();
      }
      if (sub.status !== 'ready') {
        this.logger.warn(`Redis subscriber not ready (status=${sub.status})`);
        await sub.quit().catch(() => undefined);
        return null;
      }
      this.subscriber = sub;
      return sub;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to connect Redis subscriber: ${message}`);
      await sub.quit().catch(() => undefined);
      return null;
    }
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

    try {
      await client.publish(channel, message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to publish realtime event: ${msg}`);
    }
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

      const sub = await this.getSubscriber();
      if (!sub) {
        this.handlers.delete(channel);
        return () => undefined;
      }

      try {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis subscribe failed for ${channel}: ${message}`);
        this.handlers.delete(channel);
        this.resetSubscriber();
        return () => undefined;
      }
    }

    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.resetSubscriber();
  }
}
