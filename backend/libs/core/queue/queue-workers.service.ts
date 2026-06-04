import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { MetaWebhookProcessor } from '@app/modules/communications/webhooks/workers/processors/meta-webhook.processor';
import { StripeWebhookProcessor } from '@app/modules/communications/webhooks/workers/processors/stripe-webhook.processor';
import { SendMessageProcessor } from '@app/modules/communications/messages/workers/processors/send-message.processor';
import { RedisService } from '../redis/redis.service';
import { AppointmentGoogleSyncProcessor } from './processors/appointment-google-sync.processor';
import { CalendarSyncProcessor } from './processors/calendar-sync.processor';
import { CleanupAsyncJobsProcessor } from './processors/cleanup-async-jobs.processor';
import { CleanupOrphanFilesProcessor } from './processors/cleanup-orphan-files.processor';
import { CleanupWebhookEventsProcessor } from './processors/cleanup-webhook-events.processor';
import { IntegrationResourceSyncProcessor } from './processors/integration-resource-sync.processor';
import { MetaResourceSyncProcessor } from './processors/meta-resource-sync.processor';
import {
  FILE_QUEUE,
  JOB_APPOINTMENT_GOOGLE_SYNC,
  JOB_CALENDAR_SYNC,
  JOB_CLEANUP_ASYNC_JOBS,
  JOB_CLEANUP_ORPHAN_FILES,
  JOB_CLEANUP_WEBHOOK_EVENTS,
  JOB_INTEGRATION_RESOURCE_SYNC,
  JOB_META_RESOURCE_SYNC,
  JOB_PROCESS_META_WEBHOOK,
  JOB_PROCESS_STRIPE_WEBHOOK,
  JOB_SEND_OUTBOUND_MESSAGE,
  MESSAGE_QUEUE,
  SYNC_QUEUE,
  WEBHOOK_QUEUE,
} from './queue.constants';
import type {
  AppointmentGoogleSyncJobPayload,
  CalendarSyncJobPayload,
  CleanupAsyncJobsJobPayload,
  CleanupOrphanFilesJobPayload,
  CleanupWebhookEventsJobPayload,
  IntegrationResourceSyncJobPayload,
  MetaResourceSyncJobPayload,
  ProcessMetaWebhookPayload,
  ProcessStripeWebhookPayload,
  SendOutboundMessagePayload,
} from './queue.types';

@Injectable()
export class QueueWorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkersService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly redisService: RedisService,
    private readonly metaWebhookProcessor: MetaWebhookProcessor,
    private readonly stripeWebhookProcessor: StripeWebhookProcessor,
    private readonly sendMessageProcessor: SendMessageProcessor,
    private readonly calendarSyncProcessor: CalendarSyncProcessor,
    private readonly appointmentGoogleSyncProcessor: AppointmentGoogleSyncProcessor,
    private readonly integrationResourceSyncProcessor: IntegrationResourceSyncProcessor,
    private readonly metaResourceSyncProcessor: MetaResourceSyncProcessor,
    private readonly cleanupWebhookEventsProcessor: CleanupWebhookEventsProcessor,
    private readonly cleanupAsyncJobsProcessor: CleanupAsyncJobsProcessor,
    private readonly cleanupOrphanFilesProcessor: CleanupOrphanFilesProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisService.ensureInitialized();
    const connection = this.redisService.getBullConnectionOptions(true);
    if (!connection) {
      this.logger.warn('Redis unavailable; queue workers not started');
      return;
    }

    this.workers.push(
      new Worker(WEBHOOK_QUEUE, (job) => this.handleWebhookJob(job), {
        connection,
        concurrency: 5,
      }),
      new Worker(MESSAGE_QUEUE, (job) => this.handleMessageJob(job), {
        connection,
        concurrency: 10,
        limiter: { max: 20, duration: 1000 },
      }),
      new Worker(SYNC_QUEUE, (job) => this.handleSyncJob(job), {
        connection,
        concurrency: 5,
      }),
      new Worker(FILE_QUEUE, (job) => this.handleFileJob(job), {
        connection,
        concurrency: 2,
      }),
    );

    for (const worker of this.workers) {
      worker.on('failed', (job, err) => {
        this.logger.error(
          `Job ${job?.name} (${job?.id}) failed: ${err.message}`,
          {
            jobId: job?.id,
            jobName: job?.name,
            businessId: (job?.data as { businessId?: string })?.businessId,
            asyncJobId: (job?.data as { asyncJobId?: string })?.asyncJobId,
          },
        );
      });
    }

    this.logger.log(
      'BullMQ workers started (webhook, message, sync, file queues)',
    );
  }

  private async handleWebhookJob(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_PROCESS_META_WEBHOOK:
        await this.metaWebhookProcessor.process(
          job.data as ProcessMetaWebhookPayload,
        );
        return;
      case JOB_PROCESS_STRIPE_WEBHOOK:
        await this.stripeWebhookProcessor.process(
          job.data as ProcessStripeWebhookPayload,
        );
        return;
      default:
        this.logger.warn(`Unknown webhook job: ${job.name}`);
    }
  }

  private async handleMessageJob(job: Job): Promise<void> {
    if (job.name === JOB_SEND_OUTBOUND_MESSAGE) {
      await this.sendMessageProcessor.process(
        job.data as SendOutboundMessagePayload,
      );
      return;
    }
    this.logger.warn(`Unknown message job: ${job.name}`);
  }

  private async handleSyncJob(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CALENDAR_SYNC:
        await this.calendarSyncProcessor.process(
          job.data as CalendarSyncJobPayload,
        );
        return;
      case JOB_APPOINTMENT_GOOGLE_SYNC:
        await this.appointmentGoogleSyncProcessor.process(
          job.data as AppointmentGoogleSyncJobPayload,
        );
        return;
      case JOB_INTEGRATION_RESOURCE_SYNC:
        await this.integrationResourceSyncProcessor.process(
          job.data as IntegrationResourceSyncJobPayload,
        );
        return;
      case JOB_META_RESOURCE_SYNC:
        await this.metaResourceSyncProcessor.process(
          job.data as MetaResourceSyncJobPayload,
        );
        return;
      default:
        this.logger.warn(`Unknown sync job: ${job.name}`);
    }
  }

  private async handleFileJob(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CLEANUP_WEBHOOK_EVENTS:
        await this.cleanupWebhookEventsProcessor.process(
          job.data as CleanupWebhookEventsJobPayload,
        );
        return;
      case JOB_CLEANUP_ASYNC_JOBS:
        await this.cleanupAsyncJobsProcessor.process(
          job.data as CleanupAsyncJobsJobPayload,
        );
        return;
      case JOB_CLEANUP_ORPHAN_FILES:
        await this.cleanupOrphanFilesProcessor.process(
          job.data as CleanupOrphanFilesJobPayload,
        );
        return;
      default:
        this.logger.warn(`Unknown file/cleanup job: ${job.name}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    this.workers = [];
  }
}
