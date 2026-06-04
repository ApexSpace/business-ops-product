import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { QueueService } from '@app/core/queue/queue.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { verifyMetaWebhookSignature } from '../../utils/meta-webhook-signature.util';
import { MetaConfigService } from './meta-config.service';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly metaConfigService: MetaConfigService,
    private readonly auditService: AuditService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly queueService: QueueService,
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
    const externalEventId = this.extractEventId(body);

    if (externalEventId) {
      const existing = await this.webhookEventsRepository.findByProviderAndExternalId(
        WebhookEventProvider.META,
        externalEventId,
      );
      if (existing?.status === WebhookEventStatus.PROCESSED) {
        this.logger.log(`Meta webhook ${externalEventId} already processed`);
        return;
      }
    }

    const webhookEvent = await this.webhookEventsRepository.create({
      provider: WebhookEventProvider.META,
      externalEventId,
      eventType: object ?? 'unknown',
      payload: body as Prisma.InputJsonValue,
      status: WebhookEventStatus.RECEIVED,
    });

    this.logger.log(
      `Meta webhook received object=${object ?? 'unknown'} entries=${entries?.length ?? 0}`,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      action: 'meta.webhook.received',
      entityType: 'MetaWebhook',
      entityId: externalEventId ?? object ?? 'unknown',
      metadata: {
        object: object ?? null,
        entryCount: entries?.length ?? 0,
        webhookEventId: webhookEvent.id,
      },
    });

    const bullJobId = await this.queueService.enqueueMetaWebhook({
      webhookEventId: webhookEvent.id,
    });

    if (!bullJobId) {
      this.logger.error(
        `Failed to enqueue Meta webhook ${webhookEvent.id}; ensure REDIS_URL is set`,
      );
    }
  }

  private extractEventId(body: Record<string, unknown>): string | null {
    const entries = Array.isArray(body.entry) ? body.entry : [];
    const first = entries[0] as { id?: string } | undefined;
    const messaging = (first as { messaging?: { message?: { mid?: string } }[] })
      ?.messaging;
    const mid = messaging?.[0]?.message?.mid;
    if (mid) return mid;
    return first?.id ?? null;
  }
}
