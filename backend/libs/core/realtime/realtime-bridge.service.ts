import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  REALTIME_DISABLED_EVENT,
  REALTIME_SOCKET_EVENT,
  realtimeBusinessRoom,
} from './realtime.constants';
import { RedisPubSubService } from './redis-pub-sub.service';

@Injectable()
export class RealtimeBridgeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeBridgeService.name);
  private server: Server | null = null;
  private readonly roomRefs = new Map<string, number>();
  private readonly roomUnsubscribers = new Map<string, () => void>();

  constructor(private readonly pubSub: RedisPubSubService) {}

  bindServer(server: Server): void {
    this.server = server;
  }

  isReady(): boolean {
    return this.pubSub.isAvailable();
  }

  async acquireBusiness(businessId: string): Promise<void> {
    const current = this.roomRefs.get(businessId) ?? 0;
    this.roomRefs.set(businessId, current + 1);

    if (current > 0) {
      return;
    }

    if (!this.pubSub.isAvailable()) {
      this.emitDisabled(businessId, 'redis_unavailable');
      return;
    }

    const room = realtimeBusinessRoom(businessId);
    const unsubscribe = await this.pubSub.subscribe(businessId, (message) => {
      try {
        const payload = JSON.parse(message) as {
          event: string;
          data: unknown;
          at?: string;
        };
        this.server?.to(room).emit(REALTIME_SOCKET_EVENT, payload);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Invalid realtime payload for ${businessId}: ${detail}`);
      }
    });

    this.roomUnsubscribers.set(businessId, unsubscribe);
    this.logger.log(`Realtime bridge subscribed for business ${businessId}`);
  }

  releaseBusiness(businessId: string): void {
    const current = this.roomRefs.get(businessId) ?? 0;
    if (current <= 1) {
      this.roomRefs.delete(businessId);
      const unsubscribe = this.roomUnsubscribers.get(businessId);
      unsubscribe?.();
      this.roomUnsubscribers.delete(businessId);
      this.logger.log(`Realtime bridge unsubscribed for business ${businessId}`);
      return;
    }

    this.roomRefs.set(businessId, current - 1);
  }

  private emitDisabled(businessId: string, reason: string): void {
    const room = realtimeBusinessRoom(businessId);
    this.server?.to(room).emit(REALTIME_SOCKET_EVENT, {
      event: REALTIME_DISABLED_EVENT,
      data: { reason },
      at: new Date().toISOString(),
    });
  }

  onModuleDestroy(): void {
    for (const unsubscribe of this.roomUnsubscribers.values()) {
      unsubscribe();
    }
    this.roomUnsubscribers.clear();
    this.roomRefs.clear();
    this.server = null;
  }
}
