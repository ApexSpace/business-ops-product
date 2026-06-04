import {
  assertRedisAvailable,
  isProductionEnv,
  isRedisRequired,
  RedisRequiredError,
} from './redis-requirements.util';

describe('redis-requirements.util', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('isRedisRequired is false in development', () => {
    expect(isRedisRequired({ NODE_ENV: 'development' })).toBe(false);
  });

  it('isRedisRequired is true in production by default', () => {
    expect(isRedisRequired({ NODE_ENV: 'production' })).toBe(true);
  });

  it('isRedisRequired can be disabled in production', () => {
    expect(
      isRedisRequired({ NODE_ENV: 'production', REQUIRE_REDIS: 'false' }),
    ).toBe(false);
  });

  it('assertRedisAvailable throws in production when unavailable', () => {
    expect(() =>
      assertRedisAvailable(false, { NODE_ENV: 'production', REDIS_URL: 'redis://localhost:6379' }),
    ).toThrow(RedisRequiredError);
  });

  it('assertRedisAvailable does not throw in development when unavailable', () => {
    expect(() =>
      assertRedisAvailable(false, { NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('isProductionEnv detects production', () => {
    expect(isProductionEnv({ NODE_ENV: 'production' })).toBe(true);
    expect(isProductionEnv({ NODE_ENV: 'development' })).toBe(false);
  });
});
