import { Injectable } from '@nestjs/common';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import {
  assertEmailType,
  BUSINESS_EMAIL_TYPES,
  isBusinessConfigurableEmailType,
} from '../email-type.registry';
import { EmailMessageRepository } from '../repositories/email-message.repository';
import { EmailTemplateRepository } from '../repositories/email-template.repository';
import { EmailNotificationService } from './email-notification.service';
import { EmailTemplateRendererService } from './email-template-renderer.service';

@Injectable()
export class EmailTemplateService {
  constructor(
    private readonly templateRepository: EmailTemplateRepository,
    private readonly renderer: EmailTemplateRendererService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  async getTemplate(businessId: string, emailType: string) {
    const def = assertEmailType(emailType);
    const custom = await this.templateRepository.findByBusinessAndType(
      businessId,
      emailType,
    );

    return {
      emailType,
      label: def.label,
      category: def.category,
      variables: def.variables,
      subject: custom?.subject ?? def.defaultSubject,
      htmlBody: custom?.htmlBody ?? def.defaultHtmlBody,
      textBody: custom?.textBody ?? def.defaultTextBody ?? null,
      isCustomized: !!custom,
      updatedAt: custom?.updatedAt?.toISOString() ?? null,
    };
  }

  async listTemplates(businessId: string) {
    const custom = await this.templateRepository.findByBusiness(businessId);
    const byType = new Map(custom.map((t) => [t.emailType, t]));

    return BUSINESS_EMAIL_TYPES.map((emailType) => {
      const def = assertEmailType(emailType);
      const row = byType.get(emailType);
      return {
        emailType,
        label: def.label,
        category: def.category,
        description: def.description,
        isCustomized: !!row,
        updatedAt: row?.updatedAt?.toISOString() ?? null,
      };
    });
  }

  async updateTemplate(
    businessId: string,
    emailType: string,
    data: {
      subject: string;
      htmlBody: string;
      textBody?: string | null;
    },
    actor: RequestUser,
  ) {
    assertEmailType(emailType);
    if (!isBusinessConfigurableEmailType(emailType)) {
      throw new Error(`Email type is not customizable: ${emailType}`);
    }
    this.renderer.validateTemplateVariables(
      emailType,
      data.subject,
      data.htmlBody,
      data.textBody,
    );

    await this.templateRepository.upsert(businessId, emailType, {
      subject: data.subject.trim(),
      htmlBody: data.htmlBody,
      textBody: data.textBody?.trim() || null,
      updatedByUserId: actor.id,
      createdByUserId: actor.id,
    });

    return this.getTemplate(businessId, emailType);
  }

  async previewTemplate(
    businessId: string,
    emailType: string,
    data: {
      subject: string;
      htmlBody: string;
      textBody?: string | null;
      variables?: Record<string, string>;
    },
  ) {
    assertEmailType(emailType);
    const sampleVariables = this.buildSampleVariables(emailType, data.variables);

    return this.renderer.renderEmailContent({
      emailType,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody,
      variables: sampleVariables,
    });
  }

  async sendTestEmail(
    businessId: string,
    emailType: string,
    data: {
      toEmail: string;
      subject: string;
      htmlBody: string;
      textBody?: string | null;
      variables?: Record<string, string>;
    },
    actor: RequestUser,
  ) {
    assertEmailType(emailType);
    const sampleVariables = this.buildSampleVariables(emailType, data.variables);

    void this.emailNotificationService
      .enqueueTransactionalEmail({
        businessId,
        emailType,
        toEmail: data.toEmail,
        variables: sampleVariables,
        userId: actor.id,
        idempotencyKey: `test-send-${businessId}-${emailType}-${Date.now()}`,
        metadata: { test: true },
        templateOverride: {
          subject: data.subject,
          htmlBody: data.htmlBody,
          textBody: data.textBody,
        },
      })
      .catch(() => undefined);

    return { queued: true };
  }

  async resetTemplate(businessId: string, emailType: string) {
    assertEmailType(emailType);
    if (!isBusinessConfigurableEmailType(emailType)) {
      throw new Error(`Email type is not customizable: ${emailType}`);
    }
    await this.templateRepository.deleteByBusinessAndType(businessId, emailType);
    return this.getTemplate(businessId, emailType);
  }

  private buildSampleVariables(
    emailType: string,
    overrides?: Record<string, string>,
  ): Record<string, string> {
    const def = assertEmailType(emailType);
    const samples: Record<string, string> = {
      'business.name': 'Sample Business',
      'contact.name': 'Jane Customer',
      'contact.email': 'customer@example.com',
      'invitee.email': 'newmember@example.com',
      'inviter.name': 'Alex Owner',
      invite_link: 'https://example.com/accept-invite?token=sample',
      'appointment.start_at': 'Mon, Jun 10 2026 at 2:00 PM',
      'appointment.end_at': 'Mon, Jun 10 2026 at 3:00 PM',
      'appointment.calendar_name': 'Consultations',
      'appointment.title': 'Jane Customer - Consultations',
      'invoice.number': 'INV-1001',
      'invoice.total': '$250.00',
      'invoice.due_date': 'Jul 1, 2026',
      'invoice.balance_due': '$250.00',
      'invoice.public_url': 'https://example.com/invoice/sample',
      payment_link: 'https://example.com/invoice/sample',
      'payment.amount': '$250.00',
      'payment.date': 'Jun 6, 2026',
      'appointment.previous_start_at': 'Mon, Jun 10 2026 at 1:00 PM',
      'user.name': 'Alex Owner',
      'user.email': 'alex@example.com',
      reset_link: 'https://example.com/reset-password?token=sample',
      verification_link: 'https://example.com/verify-email?token=sample',
    };

    for (const key of def.variables) {
      if (!samples[key]) {
        samples[key] = `[${key}]`;
      }
    }

    return { ...samples, ...(overrides ?? {}) };
  }
}

@Injectable()
export class EmailLogsService {
  constructor(private readonly messageRepository: EmailMessageRepository) {}

  async listLogs(
    businessId: string,
    query: {
      page?: number;
      limit?: number;
      emailType?: string;
      status?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.messageRepository.findMany(businessId, {
      skip,
      take,
      emailType: query.emailType,
      status: query.status as import('@prisma/client').EmailMessageStatus | undefined,
      search: query.search,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });

    return {
      items: items.map((item) => {
        const metadata = (item.metadata ?? {}) as Record<string, unknown>;
        const deliveredAt =
          typeof metadata.deliveredAt === 'string' ? metadata.deliveredAt : null;

        return {
          id: item.id,
          emailType: item.emailType,
          toEmail: item.toEmail,
          subject: item.subject,
          status: item.status,
          entityType: item.entityType,
          entityId: item.entityId,
          errorMessage: item.errorMessage,
          sentAt: item.sentAt?.toISOString() ?? null,
          deliveredAt,
          createdAt: item.createdAt.toISOString(),
        };
      }),
      meta: { total, page, limit },
    };
  }
}
