import { Injectable, Logger } from '@nestjs/common';
import { EmailMessageStatus } from '@prisma/client';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { SendEmailJobPayload } from '@app/core/queue/queue.types';
import { EmailMessageRepository } from '../../repositories/email-message.repository';
import { ResendProviderService } from '../../services/resend-provider.service';

@Injectable()
export class SendEmailProcessor {
  private readonly logger = new Logger(SendEmailProcessor.name);

  constructor(
    private readonly messageRepository: EmailMessageRepository,
    private readonly resendProvider: ResendProviderService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async process(payload: SendEmailJobPayload): Promise<void> {
    const scope = `send-email:${payload.emailMessageId}`;
    const claimed = await this.idempotencyService.claim(
      scope,
      payload.emailMessageId,
      3600,
    );
    if (!claimed) {
      this.logger.log(`Email ${payload.emailMessageId} already processing`);
      return;
    }

    const message = await this.messageRepository.findById(
      payload.emailMessageId,
    );
    if (!message) {
      this.logger.warn(`EmailMessage ${payload.emailMessageId} not found`);
      return;
    }

    if (
      message.status !== EmailMessageStatus.QUEUED &&
      message.status !== EmailMessageStatus.FAILED
    ) {
      return;
    }

    if (!this.resendProvider.isConfigured()) {
      await this.messageRepository.updateStatus(message.id, {
        status: EmailMessageStatus.FAILED,
        errorMessage: 'Email sending is not configured',
      });
      return;
    }

    await this.messageRepository.updateStatus(message.id, {
      status: EmailMessageStatus.SENDING,
    });

    const metadata = (message.metadata ?? {}) as Record<string, unknown>;
    const htmlBody =
      typeof metadata.htmlBody === 'string' ? metadata.htmlBody : '';
    const textBody =
      typeof metadata.textBody === 'string' ? metadata.textBody : null;

    try {
      const result = await this.resendProvider.send({
        from: message.fromEmail,
        to: message.toEmail,
        subject: message.subject,
        html: htmlBody,
        text: textBody,
        replyTo: message.replyTo,
      });

      await this.messageRepository.updateStatus(message.id, {
        status: EmailMessageStatus.SENT,
        providerMessageId: result.providerMessageId,
        sentAt: new Date(),
        errorMessage: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send email';
      await this.messageRepository.updateStatus(message.id, {
        status: EmailMessageStatus.FAILED,
        errorMessage,
      });
      throw error;
    }
  }
}
