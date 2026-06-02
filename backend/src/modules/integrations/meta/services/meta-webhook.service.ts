import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../../audit/services/audit.service';
import { MetaConfigService } from './meta-config.service';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly metaConfigService: MetaConfigService,
    private readonly auditService: AuditService,
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

  async handleEvent(body: Record<string, unknown>): Promise<void> {
    const object = body.object as string | undefined;
    const entries = body.entry as unknown[] | undefined;

    this.logger.log(
      `Meta webhook received object=${object ?? 'unknown'} entries=${entries?.length ?? 0}`,
    );

    // TODO: Verify X-Hub-Signature-256 using app secret before processing in production.

    await this.auditService.log({
      actorUserId: 'system',
      action: 'meta.webhook.received',
      entityType: 'MetaWebhook',
      entityId: object ?? 'unknown',
      metadata: {
        object: object ?? null,
        entryCount: entries?.length ?? 0,
      },
    });
  }
}
