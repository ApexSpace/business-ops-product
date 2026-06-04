import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import type { ConnectionOptions } from 'bullmq';
import {
  attachRedisErrorHandler,
  maskRedisUrl,
} from './redis.options';
import { assertRedisAvailable } from './redis-requirements.util';
import {
  buildRedisClientOptions,
  redisEndpointLabel,
} from './redis-url.util';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;
  private unavailableLogged = false;
  private initPromise: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    await this.ensureInitialized();
  }

  /** Await Redis probe (no-op when REDIS_URL is unset). */
  async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    const resolved = buildRedisClientOptions();
    if (!resolved) {
      assertRedisAvailable(false);
      return;
    }

    const { url, options } = resolved;
    const client = new Redis(url, options);
    this.bindConnectionLoss(client, url);

    try {
      await client.connect();
      await client.ping();
      this.client = client;
      this.available = true;
    } catch (err) {
      this.markUnavailable(url, err);
      client.disconnect();
    }

    assertRedisAvailable(this.available);
  }

  private bindConnectionLoss(client: Redis, url: string): void {
    attachRedisErrorHandler(client, (err) => {
      if (this.available) {
        this.available = false;
        this.client = null;
        void client.quit().catch(() => undefined);
      }
      this.markUnavailable(url, err);
    });
  }

  private markUnavailable(url: string, err: unknown): void {
    if (this.unavailableLogged) {
      return;
    }
    this.unavailableLogged = true;
    this.available = false;
    this.client = null;
    const message = err instanceof Error ? err.message : String(err);
    const endpoint = redisEndpointLabel(url);
    this.logger.warn(
      `Redis unavailable at ${endpoint} (${maskRedisUrl(url)}), realtime/idempotency/queues disabled: ${message}`,
    );
  }

  getClient(): Redis | null {
    if (!this.available || !this.client) {
      return null;
    }
    return this.client;
  }

  /** True only when REDIS_URL is set and the initial connect/ping succeeded. */
  isAvailable(): boolean {
    return this.available;
  }

  /** Alias for {@link isAvailable} — unavailable when connect fails despite REDIS_URL. */
  isEnabled(): boolean {
    return this.isAvailable();
  }

  getBullConnectionOptions(forWorker = false): ConnectionOptions | null {
    const resolved = buildRedisClientOptions(process.env, forWorker);
    if (!resolved || !this.available) {
      return null;
    }
    return {
      url: resolved.url,
      ...resolved.options,
    } as ConnectionOptions;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.available = false;
  }
}
