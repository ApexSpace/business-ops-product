import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getEmailTypeDefinition } from '@app/modules/communications/email/email-type.registry';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { EmailTemplateRendererService } from '@app/modules/communications/email/services/email-template-renderer.service';
import { PlatformSmsSendService } from '@app/modules/communications/sms/services/platform-sms-send.service';
import { assertSmsBodyWithinSegmentLimit } from '@app/modules/communications/sms/utils/sms-segment-limit.util';
import { BusinessEffectiveCapabilitiesService } from '@app/modules/platform/business/services/business-effective-capabilities.service';
import { NotificationChannelPreferenceService } from './notification-channel-preference.service';

export type NotificationDispatchResult = 'email' | 'sms' | 'skipped';

export interface DispatchNotificationParams {
  businessId: string;
  notificationKey: string;
  variables: Record<string, string>;
  toEmail?: string | null;
  toPhone?: string | null;
  contactId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  fromEmail?: string;
  fromName?: string;
  templateOverride?: {
    subject: string;
    htmlBody: string;
    textBody?: string | null;
  };
  /**
   * When the selected channel has no recipient:
   * - `throw` — staff-initiated flows (Express, manual resend)
   * - `skip` — automated/cron/owner blasts (default)
   */
  missingRecipient?: 'throw' | 'skip';
}

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly channelPreferenceService: NotificationChannelPreferenceService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly emailRenderer: EmailTemplateRendererService,
    private readonly platformSmsSendService: PlatformSmsSendService,
    private readonly effectiveCapabilities: BusinessEffectiveCapabilitiesService,
  ) {}

  async dispatch(
    params: DispatchNotificationParams,
  ): Promise<NotificationDispatchResult> {
    const typeDef = getEmailTypeDefinition(params.notificationKey);
    if (!typeDef) {
      this.logger.warn(
        `Unknown notification key skipped: ${params.notificationKey}`,
      );
      return 'skipped';
    }

    const channel = await this.channelPreferenceService.getChannel(
      params.businessId,
      params.notificationKey,
    );

    if (channel === NotificationChannel.SMS) {
      return this.dispatchSms(params, typeDef.defaultSmsBody);
    }

    return this.dispatchEmail(params);
  }

  private async dispatchEmail(
    params: DispatchNotificationParams,
  ): Promise<NotificationDispatchResult> {
    const toEmail = params.toEmail?.trim() || null;
    if (!toEmail) {
      return this.handleMissingRecipient(params, 'email');
    }

    await this.emailNotificationService.enqueueTransactionalEmail({
      businessId: params.businessId,
      emailType: params.notificationKey,
      toEmail,
      variables: params.variables,
      contactId: params.contactId,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
      fromEmail: params.fromEmail,
      fromName: params.fromName,
      templateOverride: params.templateOverride,
    });

    return 'email';
  }

  private async dispatchSms(
    params: DispatchNotificationParams,
    defaultSmsBody: string | undefined,
  ): Promise<NotificationDispatchResult> {
    const keys = await this.effectiveCapabilities.resolveFeatureKeys(
      params.businessId,
    );
    if (!keys.has('sms.notifications')) {
      if (params.missingRecipient === 'throw') {
        throw new AppException(
          ErrorCode.FEATURE_NOT_AVAILABLE,
          'SMS notifications are not included in your current package.',
          HttpStatus.FORBIDDEN,
        );
      }
      this.logger.debug(
        `SMS skipped (no sms.notifications entitlement): ${params.notificationKey} business=${params.businessId}`,
      );
      return 'skipped';
    }

    const enabled = await this.emailNotificationService.isNotificationEnabled(
      params.businessId,
      params.notificationKey,
    );
    if (!enabled) {
      this.logger.debug(
        `SMS skipped by preference: ${params.notificationKey} for business ${params.businessId}`,
      );
      return 'skipped';
    }

    const toPhone = params.toPhone?.trim() || null;
    if (!toPhone) {
      return this.handleMissingRecipient(params, 'SMS');
    }

    if (!defaultSmsBody) {
      this.logger.warn(
        `No defaultSmsBody for ${params.notificationKey}; SMS skipped`,
      );
      return 'skipped';
    }

    const body = this.emailRenderer.render(defaultSmsBody, params.variables);
    assertSmsBodyWithinSegmentLimit(body);

    await this.platformSmsSendService.sendNotification({
      businessId: params.businessId,
      to: toPhone,
      body,
      resourceId: params.entityId,
    });

    return 'sms';
  }

  private handleMissingRecipient(
    params: DispatchNotificationParams,
    channelLabel: string,
  ): NotificationDispatchResult {
    const policy = params.missingRecipient ?? 'skip';
    const message = `A ${channelLabel === 'email' ? 'email address' : 'phone number'} is required to send ${params.notificationKey} by ${channelLabel}`;

    if (policy === 'throw') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        message,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.debug(
      `Notification skipped (missing ${channelLabel} recipient): ${params.notificationKey} business=${params.businessId}`,
    );
    return 'skipped';
  }
}
