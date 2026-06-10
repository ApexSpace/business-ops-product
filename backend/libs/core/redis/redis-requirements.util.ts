/**
 * Production queue/idempotency/SSE require Redis.
 * Development and test may run without REDIS_URL (degraded mode).
 */
export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV ?? 'development') === 'production';
}

export function isRedisRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!isProductionEnv(env)) {
    return false;
  }
  return (env.REQUIRE_REDIS ?? 'true').toLowerCase() !== 'false';
}

export class RedisRequiredError extends Error {
  readonly code = 'REDIS_REQUIRED';

  constructor(message: string) {
    super(message);
    this.name = 'RedisRequiredError';
  }
}

export function assertRedisAvailable(
  isAvailable: boolean,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isRedisRequired(env)) {
    return;
  }
  const url = env.REDIS_URL?.trim();
  if (!url) {
    throw new RedisRequiredError(
      'REDIS_URL is required in production (set REQUIRE_REDIS=false only for exceptional maintenance).',
    );
  }
  if (!isAvailable) {
    throw new RedisRequiredError(
      'Redis is required in production but is unavailable. Check REDIS_URL, network, and Redis server health.',
    );
  }
}
