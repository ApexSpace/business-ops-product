import { Injectable } from '@nestjs/common';
import {
  assertRedisAvailable,
  isRedisRequired,
} from '../redis/redis-requirements.util';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly redisService: RedisService) {}

  private key(scope: string, id: string): string {
    return `idempotency:${scope}:${id}`;
  }

  async claim(scope: string, id: string, ttlSeconds = 86400): Promise<boolean> {
    const client = this.redisService.getClient();
    if (!client) {
      if (isRedisRequired()) {
        assertRedisAvailable(false);
      }
      return true;
    }
    const result = await client.set(
      this.key(scope, id),
      '1',
      'EX',
      ttlSeconds,
      'NX',
    );
    return result === 'OK';
  }

  async release(scope: string, id: string): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) return;
    await client.del(this.key(scope, id));
  }

  webhookDedupKey(provider: string, externalEventId: string): string {
    return `webhook:${provider}:${externalEventId}`;
  }

  async isWebhookProcessed(
    provider: string,
    externalEventId: string,
  ): Promise<boolean> {
    const client = this.redisService.getClient();
    if (!client) return false;
    const exists = await client.exists(
      this.webhookDedupKey(provider, externalEventId),
    );
    return exists === 1;
  }

  async markWebhookProcessed(
    provider: string,
    externalEventId: string,
    ttlSeconds = 604800,
  ): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) return;
    await client.set(
      this.webhookDedupKey(provider, externalEventId),
      '1',
      'EX',
      ttlSeconds,
    );
  }
}
