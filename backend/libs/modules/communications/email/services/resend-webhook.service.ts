import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailMessageStatus,
  Prisma,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import { Webhook } from 'svix';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { QueueService } from '@app/core/queue/queue.service';
import type { ProcessResendWebhookPayload } from '@app/core/queue/queue.types';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { EmailMessageRepository } from '../repositories/email-message.repository';

type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: { message?: string };
    failed?: { reason?: string };
  };
};

type ParsedResendWebhook = {
  event: ResendWebhookEvent;
  deliveryId: string;
};

@Injectable()
export class ResendWebhookService {
  private readonly logger = new Logger(ResendWebhookService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly messageRepository: EmailMessageRepository,
    private readonly queueService: QueueService,
  ) {}

  async handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    const parsed = this.verifyAndParse(rawBody, headers);
    await this.persistAndEnqueue(parsed);
  }

  async processQueuedEvent(payload: ProcessResendWebhookPayload): Promise<void> {
    const record = await this.webhookEventsRepository.findById(
      payload.webhookEventId,
    );
    if (!record?.payload) {
      this.logger.warn(`Resend webhook event ${payload.webhookEventId} missing`);
      return;
    }

    if (record.status === WebhookEventStatus.PROCESSED) {
      return;
    }

    try {
      const event = record.payload as unknown as ResendWebhookEvent;
      await this.dispatchEvent(event);
      await this.webhookEventsRepository.updateStatus(
        record.id,
        WebhookEventStatus.PROCESSED,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Resend webhook processing failed';
      await this.webhookEventsRepository.updateStatus(
        record.id,
        WebhookEventStatus.FAILED,
        message,
      );
      throw error;
    }
  }

  private verifyAndParse(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): ParsedResendWebhook {
    const secret = this.configService.get('email.resend.webhookSecret', {
      infer: true,
    });
    if (!secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Resend webhook secret is not configured',
        HttpStatus.BAD_REQUEST,
      );
    }

    const svixId = this.headerValue(headers['svix-id']);
    const svixTimestamp = this.headerValue(headers['svix-timestamp']);
    const svixSignature = this.headerValue(headers['svix-signature']);

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Missing Svix signature headers',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const wh = new Webhook(secret);
      const event = wh.verify(rawBody.toString('utf8'), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ResendWebhookEvent;
      return { event, deliveryId: svixId };
    } catch {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid Resend webhook signature',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async persistAndEnqueue(parsed: ParsedResendWebhook): Promise<void> {
    const { event, deliveryId } = parsed;
    const existing =
      await this.webhookEventsRepository.findByProviderAndExternalId(
        WebhookEventProvider.RESEND,
        deliveryId,
      );

    if (existing?.status === WebhookEventStatus.PROCESSED) {
      this.logger.log(`Resend webhook ${deliveryId} already processed`);
      return;
    }

    let webhookEventId = existing?.id;

    if (!webhookEventId) {
      try {
        const created = await this.webhookEventsRepository.create({
          provider: WebhookEventProvider.RESEND,
          externalEventId: deliveryId,
          eventType: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
          status: WebhookEventStatus.RECEIVED,
        });
        webhookEventId = created.id;
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
        const duplicate =
          await this.webhookEventsRepository.findByProviderAndExternalId(
            WebhookEventProvider.RESEND,
            deliveryId,
          );
        if (!duplicate) {
          throw error;
        }
        if (duplicate.status === WebhookEventStatus.PROCESSED) {
          return;
        }
        webhookEventId = duplicate.id;
      }
    }

    const jobId = await this.queueService.enqueueResendWebhook({
      webhookEventId,
    });

    if (!jobId) {
      this.logger.error(
        `Failed to enqueue Resend webhook ${webhookEventId}; ensure REDIS_URL is set`,
      );
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Failed to enqueue Resend webhook for processing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async dispatchEvent(event: ResendWebhookEvent): Promise<void> {
    const providerMessageId = event.data?.email_id;
    if (!providerMessageId) {
      return;
    }

    const message = await this.messageRepository.findByProviderMessageId(
      providerMessageId,
    );
    if (!message) {
      this.logger.warn(
        `No EmailMessage found for Resend id ${providerMessageId}`,
      );
      return;
    }

    const nextStatus = this.mapEventToStatus(event.type);
    const eventMetadata = this.buildEventMetadata(event);

    if (!nextStatus && !eventMetadata) {
      return;
    }

    if (nextStatus && nextStatus !== message.status) {
      const deliveredAt =
        nextStatus === EmailMessageStatus.DELIVERED
          ? new Date().toISOString()
          : undefined;

      await this.messageRepository.updateStatus(message.id, {
        status: nextStatus,
        errorMessage: this.resolveErrorMessage(event, nextStatus, message.errorMessage),
        sentAt:
          nextStatus === EmailMessageStatus.SENT && !message.sentAt
            ? new Date()
            : message.sentAt,
        metadataPatch: {
          ...(eventMetadata ?? {}),
          ...(deliveredAt ? { deliveredAt } : {}),
        },
      });
      return;
    }

    if (eventMetadata) {
      await this.messageRepository.mergeMetadata(message.id, eventMetadata);
    }
  }

  private mapEventToStatus(eventType: string): EmailMessageStatus | null {
    switch (eventType) {
      case 'email.sent':
        return EmailMessageStatus.SENT;
      case 'email.delivered':
        return EmailMessageStatus.DELIVERED;
      case 'email.bounced':
        return EmailMessageStatus.BOUNCED;
      case 'email.failed':
        return EmailMessageStatus.FAILED;
      case 'email.complained':
        return EmailMessageStatus.BOUNCED;
      case 'email.delivery_delayed':
        return null;
      default:
        this.logger.debug(`Unhandled Resend webhook event: ${eventType}`);
        return null;
    }
  }

  private buildEventMetadata(
    event: ResendWebhookEvent,
  ): Record<string, unknown> | null {
    switch (event.type) {
      case 'email.complained':
        return { complained: true, resendEventType: event.type };
      case 'email.delivery_delayed':
        return { deliveryDelayed: true, resendEventType: event.type };
      default:
        return null;
    }
  }

  private resolveErrorMessage(
    event: ResendWebhookEvent,
    status: EmailMessageStatus,
    currentError: string | null,
  ): string | null {
    if (status === EmailMessageStatus.BOUNCED) {
      if (event.type === 'email.complained') {
        return 'Email marked as spam complaint';
      }
      return event.data?.bounce?.message ?? 'Email bounced';
    }
    if (status === EmailMessageStatus.FAILED) {
      return event.data?.failed?.reason ?? 'Email failed to send';
    }
    return currentError;
  }

  private headerValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
