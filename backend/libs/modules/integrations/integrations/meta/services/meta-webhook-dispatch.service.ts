import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@app/core/queue/queue.service';
import { RedisService } from '@app/core/redis/redis.service';
import { MetaWebhookProcessor } from '@app/modules/communications/webhooks/workers/processors/meta-webhook.processor';

/**
 * Queues Meta webhooks for the worker when Redis is up. Processes inline only when
 * the queue is unavailable so idempotency is not contested between API and worker.
 */
@Injectable()
export class MetaWebhookDispatchService {
  private readonly logger = new Logger(MetaWebhookDispatchService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly redisService: RedisService,
    private readonly metaWebhookProcessor: MetaWebhookProcessor,
  ) {}

  async dispatch(webhookEventId: string): Promise<boolean> {
    const bullJobId = await this.queueService.enqueueMetaWebhook({
      webhookEventId,
    });

    if (bullJobId) {
      return true;
    }

    this.logger.warn(
      `Meta webhook ${webhookEventId} not queued (Redis unavailable); processing inline`,
    );

    try {
      await this.metaWebhookProcessor.process({ webhookEventId });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed';
      this.logger.error(
        `Meta webhook processing failed for ${webhookEventId}: ${message}`,
      );
      return false;
    }
  }

  /** Whether BullMQ workers can process jobs (Redis connected). */
  isQueueAvailable(): boolean {
    return this.redisService.isAvailable();
  }
}
