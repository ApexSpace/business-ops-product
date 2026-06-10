import type { RedisOptions } from 'ioredis';

/** Human-readable host:port/db for logs (no credentials). */
export function redisEndpointLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const db =
      parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
    const port =
      parsed.port || (parsed.protocol === 'rediss:' ? '6380' : '6379');
    return `${parsed.hostname}:${port}${db}`;
  } catch {
    return 'unknown-host';
  }
}

/**
 * Resolves Redis URL from env. Applies REDIS_PASSWORD when the URL has no password.
 * Prefer a single REDIS_URL in .env — dotenv keeps the last duplicate key.
 */
export function resolveRedisUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const raw = env.REDIS_URL?.trim();
  if (!raw) {
    return undefined;
  }

  const password = env.REDIS_PASSWORD?.trim();
  if (!password) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (!parsed.password) {
      parsed.password = password;
      return parsed.toString();
    }
  } catch {
    return raw;
  }

  return raw;
}

export function redisTlsEnabled(
  url: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    url.startsWith('rediss://') ||
    (env.REDIS_TLS ?? '').toLowerCase() === 'true'
  );
}

/** ioredis options merged with URL (TLS, lazy connect, reconnect caps). */
export function buildRedisClientOptions(
  env: NodeJS.ProcessEnv = process.env,
  forBullWorker = false,
): { url: string; options: RedisOptions } | null {
  const url = resolveRedisUrl(env);
  if (!url) {
    return null;
  }

  const isDev = (env.NODE_ENV ?? 'development') !== 'production';
  const maxAttempts = isDev ? 3 : 15;
  const tls = redisTlsEnabled(url, env) ? {} : undefined;

  const options: RedisOptions = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: forBullWorker ? null : isDev ? 1 : 3,
    retryStrategy(times) {
      if (times > maxAttempts) {
        return null;
      }
      return Math.min(times * 200, 3000);
    },
    ...(tls ? { tls } : {}),
  };

  return { url, options };
}
