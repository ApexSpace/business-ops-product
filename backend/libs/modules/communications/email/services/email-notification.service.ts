import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailMessageStatus, Prisma } from '@prisma/client';
import type { RootConfig } from '@app/core/config/configuration';
import { QueueService } from '@app/core/queue/queue.service';
import {
  assertEmailType,
  BUSINESS_EMAIL_TYPES,
  getEmailTypeDefinition,
} from '../email-type.registry';
import { BusinessEmailPreferenceRepository } from '../repositories/business-email-preference.repository';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { EmailTemplateRepository } from '../repositories/email-template.repository';
import { EmailTemplateRendererService } from './email-template-renderer.service';

export interface EnqueueTransactionalEmailParams {
  businessId?: string | null;
  emailType: string;
  toEmail: string;
  variables: Record<string, string>;
  contactId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  templateOverride?: {
    subject: string;
    htmlBody: string;
    textBody?: string | null;
  };
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly preferenceRepository: BusinessEmailPreferenceRepository,
    private readonly templateRepository: EmailTemplateRepository,
    private readonly messageRepository: EmailMessageRepository,
    private readonly renderer: EmailTemplateRendererService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Enqueues a transactional email for async delivery.
   *
   * Failure paths:
   * - EMAIL_ENABLED=false or preference disabled → no-op
   * - Duplicate idempotency key (non-FAILED) → no-op
   * - Redis unavailable or enqueue error → EmailMessage marked FAILED
   */
  async enqueueTransactionalEmail(
    params: EnqueueTransactionalEmailParams,
  ): Promise<void> {
    const emailConfig = this.configService.get('email', { infer: true });
    if (!emailConfig.enabled) {
      return;
    }

    const typeDef = getEmailTypeDefinition(params.emailType);
    if (!typeDef) {
      this.logger.warn(`Unknown email type skipped: ${params.emailType}`);
      return;
    }

    const toEmail = params.toEmail?.trim();
    if (!toEmail) {
      return;
    }

    const businessId = params.businessId ?? null;
    const isSystemEmail = !!typeDef.systemOnly;

    if (!isSystemEmail && businessId) {
      const preference = await this.preferenceRepository.findByBusinessAndType(
        businessId,
        params.emailType,
      );
      const enabled = preference?.enabled ?? typeDef.defaultEnabled;
      if (!enabled) {
        this.logger.debug(
          `Email skipped by preference: ${params.emailType} for business ${businessId}`,
        );
        return;
      }
    }

    const idempotencyKey =
      params.idempotencyKey ??
      this.buildDefaultIdempotencyKey(params, toEmail);

    const existing = await this.messageRepository.findExistingForSend({
      businessId,
      emailType: params.emailType,
      toEmail,
      entityType: params.entityType,
      entityId: params.entityId,
      idempotencyKey,
    });

    if (existing) {
      this.logger.debug(
        `Duplicate email enqueue skipped (${idempotencyKey}); existing ${existing.id} status=${existing.status}`,
      );
      return;
    }

    let subject = typeDef.defaultSubject;
    let htmlBody = typeDef.defaultHtmlBody;
    let textBody = typeDef.defaultTextBody ?? null;

    if (params.templateOverride) {
      subject = params.templateOverride.subject;
      htmlBody = params.templateOverride.htmlBody;
      textBody = params.templateOverride.textBody ?? null;
    } else if (!isSystemEmail && businessId) {
      const customTemplate = await this.templateRepository.findByBusinessAndType(
        businessId,
        params.emailType,
      );
      if (customTemplate) {
        subject = customTemplate.subject;
        htmlBody = customTemplate.htmlBody;
        textBody = customTemplate.textBody ?? null;
      }
    }

    const rendered = this.renderer.renderEmailContent({
      emailType: params.emailType,
      subject,
      htmlBody,
      textBody,
      variables: params.variables,
    });

    const fromEmail = emailConfig.defaultFrom!;
    const replyTo = emailConfig.defaultReplyTo ?? null;

    const message = await this.messageRepository.create({
      businessId,
      contactId: params.contactId,
      userId: params.userId,
      emailType: params.emailType,
      toEmail,
      fromEmail,
      replyTo,
      subject: rendered.subject,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: {
        ...(params.metadata ?? {}),
        idempotencyKey,
        htmlBody: rendered.htmlBody,
        textBody: rendered.textBody,
      } as Prisma.InputJsonValue,
    });

    const jobId = await this.queueService
      .enqueueSendEmail({ emailMessageId: message.id }, idempotencyKey)
      .catch(async (error) => {
        const reason =
          error instanceof Error ? error.message : 'Failed to enqueue email job';
        await this.messageRepository.updateStatus(message.id, {
          status: EmailMessageStatus.FAILED,
          errorMessage: reason,
        });
        this.logger.error(
          `EmailMessage ${message.id} marked FAILED: enqueue error (key=${idempotencyKey}): ${reason}`,
        );
        return null;
      });

    if (!jobId) {
      const existing = await this.messageRepository.findById(message.id);
      if (existing?.status === EmailMessageStatus.QUEUED) {
        await this.messageRepository.updateStatus(message.id, {
          status: EmailMessageStatus.FAILED,
          errorMessage: 'Failed to enqueue email job: queue unavailable',
        });
        this.logger.error(
          `EmailMessage ${message.id} marked FAILED: Redis unavailable during enqueue (key=${idempotencyKey})`,
        );
      }
    }
  }

  private buildDefaultIdempotencyKey(
    params: EnqueueTransactionalEmailParams,
    toEmail: string,
  ): string {
    const parts = [
      params.businessId ?? 'platform',
      params.emailType,
      params.entityType ?? 'none',
      params.entityId ?? 'none',
      toEmail.toLowerCase(),
    ];
    return parts.join(':');
  }
}

@Injectable()
export class EmailPreferenceService {
  constructor(
    private readonly preferenceRepository: BusinessEmailPreferenceRepository,
  ) {}

  async listPreferences(businessId: string) {
    const stored = await this.preferenceRepository.findByBusiness(businessId);
    const byType = new Map(stored.map((p) => [p.emailType, p]));

    return BUSINESS_EMAIL_TYPES.map((emailType) => {
      const def = assertEmailType(emailType);
      const pref = byType.get(emailType);
      return {
        emailType,
        category: def.category,
        label: def.label,
        description: def.description,
        enabled: pref?.enabled ?? def.defaultEnabled,
        isCustomized: !!pref,
        systemOnly: false,
        businessConfigurable: def.businessConfigurable !== false,
      };
    });
  }

  async updatePreferences(
    businessId: string,
    items: { emailType: string; enabled: boolean }[],
  ) {
    for (const item of items) {
      const def = assertEmailType(item.emailType);
      if (def.systemOnly || def.businessConfigurable === false) {
        throw new Error(`Email type is not configurable: ${item.emailType}`);
      }
    }

    await this.preferenceRepository.upsertMany(businessId, items);
    return this.listPreferences(businessId);
  }
}
