import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  WebhookEvent,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { normalizeMetaWebhookPayload } from '@app/modules/communications/conversations/adapters/meta/meta-inbound-normalizer';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { extractMetaWebhookEventId } from '../utils/meta-webhook-event-id.util';
import { verifyMetaWebhookSignature } from '../../utils/meta-webhook-signature.util';
import { MetaConfigService } from './meta-config.service';
import { MetaWebhookDispatchService } from './meta-webhook-dispatch.service';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly metaConfigService: MetaConfigService,
    private readonly auditService: AuditService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly metaWebhookDispatch: MetaWebhookDispatchService,
  ) {}

  async verifyChallenge(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): Promise<string | null> {
    if (mode !== 'subscribe' || !challenge) {
      return null;
    }

    let expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ?? null;
    try {
      const config = this.metaConfigService.getMetaAppConfig();
      expected = config.webhookVerifyToken ?? expected;
    } catch {
      // fall back to env only
    }

    if (!expected || token !== expected) {
      this.logger.warn('Meta webhook verification failed: token mismatch');
      return null;
    }

    return challenge;
  }

  async handleEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<void> {
    try {
      await this.handleEventInternal(rawBody, signatureHeader);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Meta webhook error';
      this.logger.error(`Meta webhook handler failed: ${message}`);
    }
  }

  private async handleEventInternal(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<void> {
    let appSecret: string;
    try {
      appSecret = this.metaConfigService.getMetaAppConfig().appSecret;
    } catch {
      this.logger.error('Meta webhook: app secret not configured');
      return;
    }

    const signatureValid = verifyMetaWebhookSignature(
      rawBody,
      signatureHeader,
      appSecret,
    );

    if (!signatureValid) {
      this.logger.warn('Meta webhook signature verification failed');
      await this.auditService.log({
        actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
        action: 'meta.webhook.signature_failed',
        entityType: 'MetaWebhook',
        entityId: 'signature',
      });
      return;
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.warn('Meta webhook: invalid JSON body');
      return;
    }

    const object = body.object as string | undefined;
    const entries = body.entry as unknown[] | undefined;
    const externalEventId = extractMetaWebhookEventId(body);

    if (externalEventId) {
      const existing = await this.webhookEventsRepository.findByProviderAndExternalId(
        WebhookEventProvider.META,
        externalEventId,
      );
      if (existing) {
        await this.resumeWebhookEvent(
          existing,
          body,
          object,
          entries?.length ?? 0,
        );
        return;
      }
    }

    let webhookEvent: WebhookEvent;
    try {
      webhookEvent = await this.webhookEventsRepository.create({
        provider: WebhookEventProvider.META,
        externalEventId,
        eventType: object ?? 'unknown',
        payload: body as Prisma.InputJsonValue,
        status: WebhookEventStatus.RECEIVED,
      });
    } catch (error) {
      if (
        externalEventId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.webhookEventsRepository.findByProviderAndExternalId(
          WebhookEventProvider.META,
          externalEventId,
        );
        if (existing) {
          await this.resumeWebhookEvent(
            existing,
            body,
            object,
            entries?.length ?? 0,
          );
          return;
        }
      }
      throw error;
    }

    await this.recordAndEnqueueWebhook(
      webhookEvent,
      object,
      entries?.length ?? 0,
      externalEventId,
    );
  }

  private async resumeWebhookEvent(
    existing: WebhookEvent,
    body: Record<string, unknown>,
    object: string | undefined,
    entryCount: number,
  ): Promise<void> {
    const incomingMessages = normalizeMetaWebhookPayload(body).messages;

    if (existing.status === WebhookEventStatus.PROCESSED) {
      this.logger.log(
        `Meta webhook ${existing.externalEventId ?? existing.id} already processed`,
      );
      return;
    }

    if (existing.status === WebhookEventStatus.IGNORED) {
      if (incomingMessages.length === 0) {
        this.logger.log(
          `Meta webhook ${existing.externalEventId ?? existing.id} already ignored (status-only)`,
        );
        return;
      }

      this.logger.log(
        `Re-opening ignored Meta webhook ${existing.externalEventId ?? existing.id} for inbound message`,
      );
      await this.webhookEventsRepository.resetForReprocessing(
        existing.id,
        body as Prisma.InputJsonValue,
      );
      await this.enqueueWebhookJob(existing.id, object, entryCount);
      return;
    }

    this.logger.log(
      `Meta webhook retry for ${existing.externalEventId ?? existing.id} (status=${existing.status})`,
    );

    await this.enqueueWebhookJob(existing.id, object, entryCount);
  }

  private async recordAndEnqueueWebhook(
    webhookEvent: WebhookEvent,
    object: string | undefined,
    entryCount: number,
    externalEventId: string | null,
  ): Promise<void> {
    this.logger.log(
      `Meta webhook received object=${object ?? 'unknown'} entries=${entryCount}`,
    );

    void this.auditService
      .log({
        actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
        action: 'meta.webhook.received',
        entityType: 'MetaWebhook',
        entityId: externalEventId ?? object ?? 'unknown',
        metadata: {
          object: object ?? null,
          entryCount,
          webhookEventId: webhookEvent.id,
        },
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Audit log failed';
        this.logger.warn(`Meta webhook audit skipped: ${message}`);
      });

    await this.enqueueWebhookJob(webhookEvent.id, object, entryCount);
  }

  private async enqueueWebhookJob(
    webhookEventId: string,
    object: string | undefined,
    entryCount: number,
  ): Promise<void> {
    const dispatched = await this.metaWebhookDispatch.dispatch(webhookEventId);

    if (!dispatched) {
      this.logger.error(
        `Failed to process Meta webhook ${webhookEventId} (object=${object ?? 'unknown'} entries=${entryCount}); start Redis (redis://127.0.0.1:6379) and the worker process`,
      );
    }
  }
}
