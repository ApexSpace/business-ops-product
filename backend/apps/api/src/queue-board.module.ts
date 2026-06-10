import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueueService } from '@app/core/queue/queue.service';
import { RedisService } from '@app/core/redis/redis.service';
import {
  MESSAGE_QUEUE,
  WEBHOOK_QUEUE,
  EMAIL_QUEUE,
} from '@app/core/queue/queue.constants';

@Injectable()
export class QueueBoardSetup implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.BULL_BOARD_ENABLED !== 'true') {
      return;
    }

    await this.redisService.ensureInitialized();

    const webhookQueue = this.queueService.getQueue(WEBHOOK_QUEUE);
    const messageQueue = this.queueService.getQueue(MESSAGE_QUEUE);
    const emailQueue = this.queueService.getQueue(EMAIL_QUEUE);
    if (!webhookQueue || !messageQueue || !emailQueue) {
      return;
    }

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');
    createBullBoard({
      queues: [
        new BullMQAdapter(webhookQueue),
        new BullMQAdapter(messageQueue),
        new BullMQAdapter(emailQueue),
      ],
      serverAdapter,
    });
  }
}

@Module({
  providers: [QueueBoardSetup],
})
export class QueueBoardModule {}
