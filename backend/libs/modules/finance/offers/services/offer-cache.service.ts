import { Injectable } from '@nestjs/common';
import { RedisService } from '@app/core/redis/redis.service';
import type { OfferDetailRow } from '../repositories/offer.repository';
import { OfferRepository } from '../repositories/offer.repository';

const CACHE_TTL_SECONDS = 300;
const CACHE_KEY_PREFIX = 'offers:enabled:';

@Injectable()
export class OfferCacheService {
  constructor(
    private readonly redisService: RedisService,
    private readonly offerRepository: OfferRepository,
  ) {}

  private cacheKey(businessId: string): string {
    return `${CACHE_KEY_PREFIX}${businessId}`;
  }

  async getEnabledOffers(businessId: string): Promise<OfferDetailRow[]> {
    const client = this.redisService.getClient();
    const key = this.cacheKey(businessId);

    if (client) {
      try {
        const cached = await client.get(key);
        if (cached) {
          return JSON.parse(cached) as OfferDetailRow[];
        }
      } catch {
        // fall through to DB
      }
    }

    const offers =
      await this.offerRepository.findEnabledWithDiscounts(businessId);

    if (client) {
      try {
        await client.set(key, JSON.stringify(offers), 'EX', CACHE_TTL_SECONDS);
      } catch {
        // ignore cache write failures
      }
    }

    return offers;
  }

  async invalidate(businessId: string): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) return;
    try {
      await client.del(this.cacheKey(businessId));
    } catch {
      // ignore
    }
  }
}
