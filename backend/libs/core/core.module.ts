import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { EventBusModule } from './events/event-bus.module';
import { HealthModule } from './health/health.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { JobEnqueueModule } from './jobs/job-enqueue.module';
import { LoggerModule } from './logger/logger.module';
import { QueueModule } from './queue/queue.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    IdempotencyModule,
    JobEnqueueModule,
    StorageModule,
    SearchModule,
    EventBusModule,
    RealtimeModule,
    LoggerModule,
    HealthModule,
  ],
  exports: [
    AppConfigModule,
    PrismaModule,
    RedisModule,
    QueueModule,
    IdempotencyModule,
    JobEnqueueModule,
    StorageModule,
    SearchModule,
    EventBusModule,
    RealtimeModule,
    LoggerModule,
    HealthModule,
  ],
})
export class CoreModule {}
