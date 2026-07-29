import { Injectable } from '@nestjs/common';
import { RedisService } from '@app/core/redis/redis.service';

export const BOOKING_DEPOSIT_HOLD_TTL_SECONDS = 600;

export type BookingDepositHoldPayload = {
  businessId: string;
  publicSlug: string;
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  amountDue: string;
  currency: string;
  contactId: string | null;
};

@Injectable()
export class BookingDepositHoldStore {
  constructor(private readonly redisService: RedisService) {}

  async save(
    holdToken: string,
    payload: BookingDepositHoldPayload,
  ): Promise<void> {
    const redis = this.redisService.getClient();
    if (!redis) return;
    await redis.setex(
      this.key(holdToken),
      BOOKING_DEPOSIT_HOLD_TTL_SECONDS,
      JSON.stringify(payload),
    );
  }

  async get(holdToken: string): Promise<BookingDepositHoldPayload | null> {
    const redis = this.redisService.getClient();
    if (!redis) return null;
    const raw = await redis.get(this.key(holdToken));
    if (!raw) return null;
    return JSON.parse(raw) as BookingDepositHoldPayload;
  }

  async require(
    holdToken: string,
    expected?: Partial<BookingDepositHoldPayload>,
  ): Promise<BookingDepositHoldPayload> {
    const stored = await this.get(holdToken);
    if (!stored) {
      throw new Error('BOOKING_HOLD_EXPIRED');
    }
    if (expected) {
      for (const [field, value] of Object.entries(expected)) {
        if (
          value !== undefined &&
          stored[field as keyof BookingDepositHoldPayload] !== value
        ) {
          throw new Error('BOOKING_HOLD_MISMATCH');
        }
      }
    }
    return stored;
  }

  async release(holdToken?: string): Promise<void> {
    if (!holdToken) return;
    const redis = this.redisService.getClient();
    if (!redis) return;
    await redis.del(this.key(holdToken));
  }

  private key(token: string) {
    return `booking-hold:${token}`;
  }
}
