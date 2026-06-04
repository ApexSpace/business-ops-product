import type { RedisOptions } from 'ioredis';
import { buildRedisClientOptions } from './redis-url.util';

/** Redact credentials from Redis URLs before logging. */
export function maskRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username && parsed.username !== 'default') {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch {
    return 'redis://***';
  }
}

/** Shared ioredis options: lazy connect, capped reconnects, TLS when rediss:// or REDIS_TLS=true. */
export function buildRedisOptions(forBullWorker = false): RedisOptions {
  const resolved = buildRedisClientOptions(process.env, forBullWorker);
  if (!resolved) {
    return {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: forBullWorker ? null : 1,
    };
  }
  return resolved.options;
}

/** Prevent ioredis "Unhandled error event" when the connection drops. */
export function attachRedisErrorHandler(
  client: { on(event: 'error', listener: (err: Error) => void): void },
  onError: (err: Error) => void,
): void {
  client.on('error', onError);
}
