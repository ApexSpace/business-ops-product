import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { MetaWebhookProcessor } from '@app/modules/communications/webhooks/workers/processors/meta-webhook.processor';
import { StripeWebhookProcessor } from '@app/modules/communications/webhooks/workers/processors/stripe-webhook.processor';
import { SendMessageProcessor } from '@app/modules/communications/messages/workers/processors/send-message.processor';
import { RedisService } from '../redis/redis.service';
import {
  JOB_PROCESS_META_WEBHOOK,
  JOB_PROCESS_STRIPE_WEBHOOK,
  JOB_SEND_OUTBOUND_MESSAGE,
  MESSAGE_QUEUE,
  WEBHOOK_QUEUE,
  WEBHOOK_QUEUE_CONCURRENCY,
} from './queue.constants';

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly redisService: RedisService,
    private readonly metaWebhookProcessor: MetaWebhookProcessor,
    private readonly stripeWebhookProcessor: StripeWebhookProcessor,
    private readonly sendMessageProcessor: SendMessageProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisService.ensureInitialized();
    const connection = this.redisService.getBullConnectionOptions(true);
    if (!connection) {
      this.logger.warn('Redis unavailable; queue consumers not started');
      return;
    }

    this.workers.push(
      new Worker(
        WEBHOOK_QUEUE,
        async (job: Job) => this.handleWebhookJob(job),
        { connection, concurrency: WEBHOOK_QUEUE_CONCURRENCY },
      ),
      new Worker(
        MESSAGE_QUEUE,
        async (job: Job) => this.handleMessageJob(job),
        { connection, concurrency: 10 },
      ),
    );

    for (const worker of this.workers) {
      worker.on('failed', (job, err) => {
        this.logger.error(
          `Job ${job?.name} (${job?.id}) failed: ${err.message}`,
        );
      });
    }

    this.logger.log(`Started ${this.workers.length} BullMQ workers`);
  }

  private async handleWebhookJob(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_PROCESS_META_WEBHOOK:
        await this.metaWebhookProcessor.process(job.data);
        return;
      case JOB_PROCESS_STRIPE_WEBHOOK:
        await this.stripeWebhookProcessor.process(job.data);
        return;
      default:
        this.logger.warn(`Unknown webhook job: ${job.name}`);
    }
  }

  private async handleMessageJob(job: Job): Promise<void> {
    if (job.name === JOB_SEND_OUTBOUND_MESSAGE) {
      await this.sendMessageProcessor.process(job.data);
      return;
    }
    this.logger.warn(`Unknown message job: ${job.name}`);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    this.workers = [];
  }
}
