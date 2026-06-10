import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  assertRedisAvailable,
  isRedisRequired,
} from '../redis/redis-requirements.util';
import { RedisService } from '../redis/redis.service';
import {
  EMAIL_QUEUE,
  FILE_QUEUE,
  JOB_PROCESS_META_WEBHOOK,
  JOB_PROCESS_RESEND_WEBHOOK,
  JOB_PROCESS_STRIPE_WEBHOOK,
  JOB_SEND_EMAIL,
  JOB_SEND_OUTBOUND_MESSAGE,
  MESSAGE_QUEUE,
  SEARCH_QUEUE,
  SYNC_QUEUE,
  WEBHOOK_QUEUE,
} from './queue.constants';
import type {
  ProcessMetaWebhookPayload,
  ProcessResendWebhookPayload,
  ProcessStripeWebhookPayload,
  SendEmailJobPayload,
  SendOutboundMessagePayload,
} from './queue.types';
import { resolveEmailConfig } from '../config/email/email.config';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly redisService: RedisService) {}

  private guardQueueAvailable(
    queue: Queue | null,
    operation: string,
  ): queue is Queue {
    if (queue) {
      return true;
    }
    if (isRedisRequired()) {
      assertRedisAvailable(false);
    }
    this.logger.warn(`Redis unavailable; cannot ${operation}`);
    return false;
  }

  getQueue(name: string): Queue | null {
    const conn = this.redisService.getBullConnectionOptions(false);
    if (!conn) return null;
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: conn,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  webhookQueue(): Queue | null {
    return this.getQueue(WEBHOOK_QUEUE);
  }

  messageQueue(): Queue | null {
    return this.getQueue(MESSAGE_QUEUE);
  }

  syncQueue(): Queue | null {
    return this.getQueue(SYNC_QUEUE);
  }

  fileQueue(): Queue | null {
    return this.getQueue(FILE_QUEUE);
  }

  searchQueue(): Queue | null {
    return this.getQueue(SEARCH_QUEUE);
  }

  emailQueue(): Queue | null {
    return this.getQueue(EMAIL_QUEUE);
  }

  private emailJobOptions() {
    const email = resolveEmailConfig();
    return {
      attempts: email.queue.jobAttempts,
      backoff: {
        type: 'exponential' as const,
        delay: email.queue.jobBackoffMs,
      },
    };
  }

  async enqueueSendEmail(
    payload: SendEmailJobPayload,
    idempotencyKey?: string,
  ): Promise<string | null> {
    const queue = this.emailQueue();
    const jobId = idempotencyKey
      ? `email-${idempotencyKey}`
      : `email-${payload.emailMessageId}`;
    if (!this.guardQueueAvailable(queue, `enqueue send email (${jobId})`)) {
      return null;
    }
    try {
      const job = await queue.add(JOB_SEND_EMAIL, payload, {
        ...this.emailJobOptions(),
        jobId,
      });
      return job.id ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue send email job ${jobId}: ${message}`,
      );
      throw error;
    }
  }

  async enqueueResendWebhook(
    payload: ProcessResendWebhookPayload,
  ): Promise<string | null> {
    const queue = this.emailQueue();
    const jobId = `resend-webhook-${payload.webhookEventId}`;
    if (!this.guardQueueAvailable(queue, `enqueue Resend webhook (${jobId})`)) {
      return null;
    }
    try {
      const job = await queue.add(JOB_PROCESS_RESEND_WEBHOOK, payload, {
        ...this.emailJobOptions(),
        jobId,
      });
      return job.id ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue Resend webhook job ${jobId}: ${message}`,
      );
      throw error;
    }
  }

  async enqueueMetaWebhook(
    payload: ProcessMetaWebhookPayload,
  ): Promise<string | null> {
    const queue = this.webhookQueue();
    if (!this.guardQueueAvailable(queue, 'enqueue Meta webhook')) {
      return null;
    }
    const job = await queue.add(JOB_PROCESS_META_WEBHOOK, payload);
    return job.id ?? null;
  }

  async enqueueStripeWebhook(
    payload: ProcessStripeWebhookPayload,
  ): Promise<string | null> {
    const queue = this.webhookQueue();
    if (!this.guardQueueAvailable(queue, 'enqueue Stripe webhook')) {
      return null;
    }
    const job = await queue.add(JOB_PROCESS_STRIPE_WEBHOOK, payload);
    return job.id ?? null;
  }

  async enqueueSendMessage(
    payload: SendOutboundMessagePayload,
    idempotencyKey?: string,
  ): Promise<string | null> {
    const queue = this.messageQueue();
    if (!this.guardQueueAvailable(queue, 'enqueue send message')) {
      return null;
    }
    const job = await queue.add(JOB_SEND_OUTBOUND_MESSAGE, payload, {
      jobId: idempotencyKey
        ? `send-${payload.businessId}-${idempotencyKey}`
        : `send-msg-${payload.messageId}`,
    });
    return job.id ?? null;
  }

  async addSyncJob(
    jobName: string,
    payload: Record<string, unknown>,
    jobId?: string,
  ): Promise<string | null> {
    const queue = this.syncQueue();
    if (!this.guardQueueAvailable(queue, `enqueue sync job ${jobName}`)) {
      return null;
    }
    const job = await queue.add(
      jobName,
      payload,
      jobId ? { jobId } : undefined,
    );
    return job.id ?? null;
  }

  async addFileJob(
    jobName: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    const queue = this.fileQueue();
    if (!this.guardQueueAvailable(queue, `enqueue file job ${jobName}`)) {
      return null;
    }
    const job = await queue.add(jobName, payload);
    return job.id ?? null;
  }
}
