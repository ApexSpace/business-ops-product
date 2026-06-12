import { Injectable } from '@nestjs/common';
import type { NormalizedWhatsAppDeliveryStatus } from '../adapters/meta/meta-inbound-normalizer';
import { RedisService } from '@app/core/redis/redis.service';

const KEY_PREFIX = 'wa:pending-status:';
const TTL_SECONDS = 900;

type SerializedStatus = {
  externalMessageId: string;
  status: NormalizedWhatsAppDeliveryStatus['status'];
  timestamp: string;
  recipientId: string;
  errorMessage: string | null;
};

@Injectable()
export class WhatsAppDeliveryStatusBufferService {
  private readonly memory = new Map<string, NormalizedWhatsAppDeliveryStatus[]>();

  constructor(private readonly redisService: RedisService) {}

  async buffer(status: NormalizedWhatsAppDeliveryStatus): Promise<void> {
    const wamid = status.externalMessageId.trim();
    if (!wamid) {
      return;
    }

    if (this.redisService.isAvailable()) {
      const client = this.redisService.getClient();
      if (client) {
        const key = `${KEY_PREFIX}${wamid}`;
        await client.rpush(key, JSON.stringify(this.serialize(status)));
        await client.expire(key, TTL_SECONDS);
        return;
      }
    }

    const list = this.memory.get(wamid) ?? [];
    list.push(status);
    this.memory.set(wamid, list);
  }

  async takeAll(
    externalMessageId: string,
  ): Promise<NormalizedWhatsAppDeliveryStatus[]> {
    const wamid = externalMessageId.trim();
    if (!wamid) {
      return [];
    }

    if (this.redisService.isAvailable()) {
      const client = this.redisService.getClient();
      if (client) {
        const key = `${KEY_PREFIX}${wamid}`;
        const raw = await client.lrange(key, 0, -1);
        if (raw.length > 0) {
          await client.del(key);
        }
        return this.sortStatuses(raw.map((entry) => this.deserialize(entry)));
      }
    }

    const buffered = this.memory.get(wamid) ?? [];
    this.memory.delete(wamid);
    return this.sortStatuses(buffered);
  }

  private sortStatuses(
    statuses: NormalizedWhatsAppDeliveryStatus[],
  ): NormalizedWhatsAppDeliveryStatus[] {
    return [...statuses].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  private serialize(status: NormalizedWhatsAppDeliveryStatus): string {
    const payload: SerializedStatus = {
      externalMessageId: status.externalMessageId,
      status: status.status,
      timestamp: status.timestamp.toISOString(),
      recipientId: status.recipientId,
      errorMessage: status.errorMessage,
    };
    return JSON.stringify(payload);
  }

  private deserialize(raw: string): NormalizedWhatsAppDeliveryStatus {
    const parsed = JSON.parse(raw) as SerializedStatus;
    return {
      externalMessageId: parsed.externalMessageId,
      status: parsed.status,
      timestamp: new Date(parsed.timestamp),
      recipientId: parsed.recipientId,
      errorMessage: parsed.errorMessage,
    };
  }
}
