import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@app/core/queue/queue.service';
import { RedisService } from '@app/core/redis/redis.service';
import { ResendWebhookProcessor } from '../workers/processors/resend-webhook.processor';

/**
 * Queues Resend webhooks for the worker when Redis is up. Processes inline only when
 * the queue is unavailable so idempotency is not contested between API and worker.
 */
@Injectable()
export class ResendWebhookDispatchService {
  private readonly logger = new Logger(ResendWebhookDispatchService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly redisService: RedisService,
    private readonly resendWebhookProcessor: ResendWebhookProcessor,
  ) {}

  async dispatch(webhookEventId: string): Promise<boolean> {
    const bullJobId = await this.queueService.enqueueResendWebhook({
      webhookEventId,
    });

    if (bullJobId) {
      return true;
    }

    this.logger.warn(
      `Resend webhook ${webhookEventId} not queued (Redis unavailable); processing inline`,
    );

    try {
      await this.resendWebhookProcessor.process({ webhookEventId });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed';
      this.logger.error(
        `Resend webhook processing failed for ${webhookEventId}: ${message}`,
      );
      return false;
    }
  }

  /** Whether BullMQ workers can process jobs (Redis connected). */
  isQueueAvailable(): boolean {
    return this.redisService.isAvailable();
  }
}
