import { IdempotencyService } from './idempotency.service';
import { RedisService } from '../redis/redis.service';

describe('IdempotencyService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function createService(redisAvailable: boolean) {
    const redisService = {
      getClient: () =>
        redisAvailable ? ({ set: jest.fn() } as unknown) : null,
    } as unknown as RedisService;
    return new IdempotencyService(redisService);
  }

  it('allows claim in development when Redis is down (legacy degrade)', async () => {
    process.env.NODE_ENV = 'development';
    const service = createService(false);
    await expect(service.claim('scope', 'id-1')).resolves.toBe(true);
  });

  it('fails closed in production when Redis is down', async () => {
    process.env.NODE_ENV = 'production';
    process.env.REQUIRE_REDIS = 'true';
    process.env.REDIS_URL = 'redis://localhost:6379';
    const service = createService(false);
    await expect(service.claim('scope', 'id-1')).rejects.toThrow(
      'Redis is required',
    );
  });
});
