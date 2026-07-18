import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConversationChannel,
  MessageStatus,
  WebhookEventProvider,
  WebhookEventStatus,
} from '@prisma/client';
import type { RootConfig } from '@app/core/config/configuration';
import { normalizeE164Phone } from '@app/core/config/twilio/twilio.config';
import { ConversationMessagesRepository } from '@app/modules/communications/conversations/repositories/conversation-messages.repository';
import { ConversationWebhookIngestionService } from '@app/modules/communications/conversations/services/conversation-webhook-ingestion.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { SmsModeResolverService } from '@app/modules/integrations/twilio/services/sms-mode-resolver.service';
import { TwilioApiClient } from '@app/modules/integrations/twilio/services/twilio-api-client';
import { TwilioCredentialsService } from '@app/modules/integrations/twilio/services/twilio-credentials.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { SMS_PROVIDER_KEY } from '../constants/sms-platform.constants';
import { normalizeTwilioInboundSms } from '../adapters/twilio-inbound.normalizer';
import { PlatformSmsComplianceService } from './platform-sms-compliance.service';
import { parseSmsComplianceKeyword } from '../utils/sms-compliance-keywords.util';

@Injectable()
export class TwilioSmsWebhookService {
  private readonly logger = new Logger(TwilioSmsWebhookService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly conversationWebhookIngestion: ConversationWebhookIngestionService,
    private readonly smsModeResolver: SmsModeResolverService,
    private readonly twilioApiClient: TwilioApiClient,
    private readonly twilioCredentialsService: TwilioCredentialsService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly platformSmsCompliance: PlatformSmsComplianceService,
    private readonly messagesRepository: ConversationMessagesRepository,
  ) {}

  validateSignature(
    signature: string | undefined,
    url: string,
    params: Record<string, string>,
    accountSid?: string,
  ): boolean {
    const twilioConfig = this.configService.get('twilio', { infer: true });
    if (!twilioConfig.authToken) return false;

    if (!accountSid || accountSid === twilioConfig.accountSid) {
      return this.twilioApiClient.validateWebhookSignature(
        twilioConfig.authToken,
        signature,
        url,
        params,
      );
    }

    return false;
  }

  async validateBusinessSignature(
    signature: string | undefined,
    url: string,
    params: Record<string, string>,
    accountSid: string,
  ): Promise<boolean> {
    const integration =
      await this.businessIntegrationRepository.findFirstByProviderConfigAccountSid(
        SMS_PROVIDER_KEY,
        accountSid,
      );
    if (!integration?.credentials) {
      return false;
    }
    try {
      const creds = this.twilioCredentialsService.decrypt(integration.credentials);
      return this.twilioApiClient.validateWebhookSignature(
        creds.authToken,
        signature,
        url,
        params,
      );
    } catch {
      return false;
    }
  }

  isPlatformInbound(to: string | undefined): boolean {
    if (!to) return false;
    return this.smsModeResolver.isPlatformNumber(to);
  }

  isComplianceKeyword(body: string | null | undefined): boolean {
    return parseSmsComplianceKeyword(body) !== null;
  }

  async persistAndEnqueue(params: {
    eventType: string;
    payload: Record<string, string>;
    externalEventId?: string;
  }): Promise<string> {
    const record = await this.webhookEventsRepository.create({
      provider: WebhookEventProvider.TWILIO,
      eventType: params.eventType,
      externalEventId: params.externalEventId ?? null,
      payload: params.payload,
    });
    return record.id;
  }

  async processWebhookEvent(webhookEventId: string): Promise<string | null> {
    const event = await this.webhookEventsRepository.findById(webhookEventId);
    if (!event || event.status === WebhookEventStatus.PROCESSED) {
      return null;
    }

    const payload = (event.payload ?? {}) as Record<string, string>;

    if (payload.MessageStatus) {
      await this.processStatusCallback(payload);
      await this.webhookEventsRepository.updateStatus(
        webhookEventId,
        WebhookEventStatus.PROCESSED,
      );
      return buildEmptyTwimlResponse();
    }

    const to = payload.To ?? '';
    const from = payload.From ?? '';
    const body = payload.Body ?? null;

    // Platform number is normally compliance-only (STOP/HELP for notification SMS).
    // If the same number is also connected as a business inbox number (common in
    // single-number local testing), route normal messages into conversations.
    if (this.smsModeResolver.isPlatformNumber(to)) {
      const businessOwnsNumber =
        await this.smsModeResolver.isBusinessOwnedFromNumber(to);

      if (!businessOwnsNumber || this.isComplianceKeyword(body)) {
        const result = await this.platformSmsCompliance.handleInbound({
          to,
          from,
          body,
        });
        await this.webhookEventsRepository.updateStatus(
          webhookEventId,
          WebhookEventStatus.PROCESSED,
        );
        return result.twiml ?? buildEmptyTwimlResponse();
      }
    }

    const inbound = normalizeTwilioInboundSms(payload);
    if (!inbound) {
      await this.webhookEventsRepository.updateStatus(
        webhookEventId,
        WebhookEventStatus.IGNORED,
      );
      return buildEmptyTwimlResponse();
    }

    await this.conversationWebhookIngestion.ingestNormalizedInbound(inbound);
    await this.webhookEventsRepository.updateStatus(
      webhookEventId,
      WebhookEventStatus.PROCESSED,
    );
    return buildEmptyTwimlResponse();
  }

  private async processStatusCallback(payload: Record<string, string>) {
    const messageSid = payload.MessageSid?.trim();
    const status = payload.MessageStatus?.trim().toLowerCase();
    if (!messageSid || !status) return;

    const mapped = mapTwilioStatus(status);
    if (!mapped) return;

    const message =
      await this.messagesRepository.findByChannelExternalMessageId(
        ConversationChannel.SMS,
        messageSid,
      );
    if (!message) return;

    await this.messagesRepository.update(message.id, {
      status: mapped,
    });
  }
}

function mapTwilioStatus(status: string): MessageStatus | null {
  switch (status) {
    case 'queued':
    case 'accepted':
    case 'scheduled':
    case 'sending':
      return MessageStatus.PENDING;
    case 'sent':
      return MessageStatus.SENT;
    case 'delivered':
      return MessageStatus.DELIVERED;
    case 'read':
      return MessageStatus.READ;
    case 'failed':
    case 'undelivered':
    case 'canceled':
      return MessageStatus.FAILED;
    default:
      return null;
  }
}

function buildEmptyTwimlResponse(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
}
