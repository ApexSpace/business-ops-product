import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';
import { isRedisRequired } from '../redis/redis-requirements.util';
import { resolveRedisUrl } from '../redis/redis-url.util';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = resolveRedisUrl();
    const required = isRedisRequired();

    if (!url) {
      if (required) {
        throw new HealthCheckError(
          'Redis check failed',
          this.getStatus(key, false, {
            message: 'REDIS_URL is not configured',
            required: true,
          }),
        );
      }
      return this.getStatus(key, true, {
        optional: true,
        message: 'REDIS_URL not set (development mode)',
      });
    }

    await this.redisService.ensureInitialized();

    if (!this.redisService.isAvailable()) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          message: 'Redis ping failed or connection lost',
          required,
        }),
      );
    }

    return this.getStatus(key, true, { required });
  }
}
