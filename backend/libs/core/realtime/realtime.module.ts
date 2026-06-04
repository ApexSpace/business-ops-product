import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RedisPubSubService } from './redis-pub-sub.service';
import { SseController } from './sse.controller';

@Module({
  imports: [RedisModule],
  controllers: [SseController],
  providers: [RedisPubSubService],
  exports: [RedisPubSubService],
})
export class RealtimeModule {}
