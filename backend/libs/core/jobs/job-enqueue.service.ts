import { Injectable } from '@nestjs/common';
import { AsyncJob, AsyncJobStatus, Prisma } from '@prisma/client';
import {
  FILE_QUEUE,
  JOB_APPOINTMENT_GOOGLE_SYNC,
  JOB_CALENDAR_SYNC,
  JOB_INTEGRATION_RESOURCE_SYNC,
  JOB_META_RESOURCE_SYNC,
  MESSAGE_QUEUE,
  SYNC_QUEUE,
  WEBHOOK_QUEUE,
} from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import type {
  AppointmentGoogleSyncJobPayload,
  CalendarSyncJobPayload,
  IntegrationResourceSyncJobPayload,
  MetaResourceSyncJobPayload,
  ProcessMetaWebhookPayload,
  ProcessStripeWebhookPayload,
  SendOutboundMessagePayload,
} from '../queue/queue.types';
import { AsyncJobRepository } from './async-job.repository';

@Injectable()
export class JobEnqueueService {
  constructor(
    private readonly asyncJobRepository: AsyncJobRepository,
    private readonly queueService: QueueService,
  ) {}

  async createJob(params: {
    businessId: string;
    type: string;
    entityType?: string;
    entityId?: string;
    idempotencyKey?: string;
    bullJobId?: string | null;
    createdById?: string;
  }) {
    if (params.idempotencyKey) {
      const existing = await this.asyncJobRepository.findByIdempotencyKey(
        params.businessId,
        params.idempotencyKey,
      );
      if (existing) {
        return existing;
      }
    }

    return this.asyncJobRepository.create({
      business: { connect: { id: params.businessId } },
      type: params.type,
      status: AsyncJobStatus.QUEUED,
      entityType: params.entityType,
      entityId: params.entityId,
      idempotencyKey: params.idempotencyKey,
      bullJobId: params.bullJobId ?? undefined,
      ...(params.createdById
        ? { createdBy: { connect: { id: params.createdById } } }
        : {}),
    });
  }

  private async enqueueWithAsyncJob<T extends { asyncJobId: string }>(params: {
    businessId: string;
    type: string;
    jobName: string;
    payload: Omit<T, 'asyncJobId'>;
    entityType?: string;
    entityId?: string;
    idempotencyKey?: string;
    actorUserId?: string;
    bullJobId?: string;
  }): Promise<AsyncJob> {
    const asyncJob = await this.createJob({
      businessId: params.businessId,
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      idempotencyKey: params.idempotencyKey,
      createdById: params.actorUserId,
    });

    const fullPayload = {
      ...params.payload,
      asyncJobId: asyncJob.id,
    } as T;

    const bullJobId = await this.queueService.addSyncJob(
      params.jobName,
      fullPayload as Record<string, unknown>,
      params.bullJobId ?? `async-${asyncJob.id}`,
    );

    if (bullJobId) {
      await this.asyncJobRepository.update(asyncJob.id, { bullJobId });
    }

    return asyncJob;
  }

  async enqueueMetaWebhook(webhookEventId: string): Promise<void> {
    await this.queueService.enqueueMetaWebhook({ webhookEventId });
  }

  async enqueueStripeWebhook(
    payload: ProcessStripeWebhookPayload,
  ): Promise<void> {
    await this.queueService.enqueueStripeWebhook(payload);
  }

  async enqueueSendMessage(
    payload: Omit<SendOutboundMessagePayload, 'asyncJobId'> & {
      conversationId: string;
    },
    idempotencyKey: string | undefined,
    _actorUserId: string,
  ): Promise<{ asyncJob: AsyncJob }> {
    const asyncJob = await this.createJob({
      businessId: payload.businessId,
      type: 'send_outbound_message',
      entityType: 'ConversationMessage',
      entityId: payload.messageId,
      idempotencyKey,
    });

    const bullJobId = await this.queueService.enqueueSendMessage(
      {
        messageId: payload.messageId,
        businessId: payload.businessId,
        asyncJobId: asyncJob.id,
      },
      idempotencyKey,
    );

    if (bullJobId) {
      await this.asyncJobRepository.update(asyncJob.id, { bullJobId });
    }

    return { asyncJob };
  }

  async enqueueCalendarSync(params: {
    businessId: string;
    calendarId: string;
    actorUserId: string;
    idempotencyKey?: string;
  }): Promise<AsyncJob> {
    return this.enqueueWithAsyncJob<CalendarSyncJobPayload>({
      businessId: params.businessId,
      type: 'calendar_google_sync',
      jobName: JOB_CALENDAR_SYNC,
      entityType: 'Calendar',
      entityId: params.calendarId,
      actorUserId: params.actorUserId,
      idempotencyKey:
        params.idempotencyKey ??
        `calendar-sync-${params.businessId}-${params.calendarId}`,
      payload: {
        businessId: params.businessId,
        calendarId: params.calendarId,
        actorUserId: params.actorUserId,
      },
    });
  }

  async enqueueAppointmentGoogleSync(params: {
    businessId: string;
    appointmentId: string;
    actorUserId: string;
    operation?: 'sync' | 'delete';
    calendarId?: string;
    externalEventId?: string | null;
    externalProvider?: string | null;
  }): Promise<AsyncJob> {
    const op = params.operation ?? 'sync';
    return this.enqueueWithAsyncJob<AppointmentGoogleSyncJobPayload>({
      businessId: params.businessId,
      type: op === 'delete' ? 'appointment_google_delete' : 'appointment_google_sync',
      jobName: JOB_APPOINTMENT_GOOGLE_SYNC,
      entityType: 'Appointment',
      entityId: params.appointmentId,
      actorUserId: params.actorUserId,
      bullJobId: `appt-google-${op}-${params.appointmentId}`,
      payload: {
        businessId: params.businessId,
        appointmentId: params.appointmentId,
        actorUserId: params.actorUserId,
        operation: op,
        calendarId: params.calendarId,
        externalEventId: params.externalEventId,
        externalProvider: params.externalProvider,
      },
    });
  }

  async enqueueIntegrationResourceSync(params: {
    businessId: string;
    providerKey: string;
    actorUserId?: string;
    idempotencyKey?: string;
  }): Promise<AsyncJob> {
    return this.enqueueWithAsyncJob<IntegrationResourceSyncJobPayload>({
      businessId: params.businessId,
      type: 'integration_resource_sync',
      jobName: JOB_INTEGRATION_RESOURCE_SYNC,
      entityType: 'BusinessIntegration',
      entityId: params.providerKey,
      actorUserId: params.actorUserId,
      idempotencyKey:
        params.idempotencyKey ??
        `integration-sync-${params.businessId}-${params.providerKey}`,
      payload: {
        businessId: params.businessId,
        providerKey: params.providerKey,
        actorUserId: params.actorUserId,
      },
    });
  }

  async enqueueMetaResourceSync(params: {
    businessId: string;
    providerKey: string;
    idempotencyKey?: string;
  }): Promise<AsyncJob> {
    return this.enqueueWithAsyncJob<MetaResourceSyncJobPayload>({
      businessId: params.businessId,
      type: 'meta_resource_sync',
      jobName: JOB_META_RESOURCE_SYNC,
      entityType: 'BusinessIntegration',
      entityId: params.providerKey,
      idempotencyKey:
        params.idempotencyKey ??
        `meta-sync-${params.businessId}-${params.providerKey}`,
      payload: {
        businessId: params.businessId,
        providerKey: params.providerKey,
      },
    });
  }

  async markJobActive(asyncJobId: string): Promise<void> {
    await this.asyncJobRepository.markActive(asyncJobId);
  }

  async markJobCompleted(
    asyncJobId: string,
    result?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.asyncJobRepository.markCompleted(asyncJobId, result);
  }

  async markJobFailed(asyncJobId: string, errorMessage: string): Promise<void> {
    await this.asyncJobRepository.markFailed(asyncJobId, errorMessage);
  }
}
