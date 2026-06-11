import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RootConfig } from '@app/core/config/configuration';
import { ConversationWebhookIngestionService } from '@app/modules/communications/conversations/services/conversation-webhook-ingestion.service';
import {
  normalizeResendInboundEmail,
  type ResendInboundEmailPayload,
} from '@app/modules/communications/conversations/adapters/email/resend-inbound.normalizer';
import { ResendProviderService } from './resend-provider.service';

@Injectable()
export class ResendInboundEmailService {
  private readonly logger = new Logger(ResendInboundEmailService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly resendProvider: ResendProviderService,
    private readonly conversationWebhookIngestion: ConversationWebhookIngestionService,
  ) {}

  async processInboundPayload(payload: ResendInboundEmailPayload): Promise<void> {
    const enriched = await this.enrichFromResendApi(payload);
    const inboundDomain = this.configService.get('email.platform.inboundDomain', {
      infer: true,
    });
    const inbound = normalizeResendInboundEmail(enriched, inboundDomain);
    if (!inbound) {
      this.logger.warn(
        `Resend inbound email ignored: no routable conversation address (email_id=${payload.email_id ?? 'unknown'})`,
      );
      return;
    }

    await this.conversationWebhookIngestion.ingestNormalizedInbound(inbound);
  }

  private async enrichFromResendApi(
    payload: ResendInboundEmailPayload,
  ): Promise<ResendInboundEmailPayload> {
    const emailId = payload.email_id?.trim();
    if (!emailId) {
      return payload;
    }

    try {
      const received = await this.resendProvider.getReceivedEmail(emailId);
      return {
        ...payload,
        from: received.from ?? payload.from,
        to: received.to ?? payload.to,
        subject: received.subject ?? payload.subject,
        text: received.text ?? payload.text,
        html: received.html ?? payload.html,
        message_id: received.message_id ?? payload.message_id,
        headers: received.headers ?? payload.headers,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch received email';
      this.logger.warn(
        `Could not fetch Resend received email ${emailId}; using webhook metadata only: ${message}`,
      );
      return payload;
    }
  }
}
