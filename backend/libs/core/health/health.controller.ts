import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Public()
  @SkipEnvelope()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () =>
        this.memory.checkHeap(
          'memory_heap',
          parseInt(
            process.env.HEALTH_HEAP_LIMIT_BYTES ??
              String(512 * 1024 * 1024),
            10,
          ),
        ),
    ]);
  }
}
