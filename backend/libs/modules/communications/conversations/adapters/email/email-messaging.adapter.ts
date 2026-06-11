import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RootConfig } from '@app/core/config/configuration';
import { EMAIL_PROVIDER_KEY } from '@app/modules/communications/email/constants/email-platform.constants';
import { ResendProviderService } from '@app/modules/communications/email/services/resend-provider.service';
import { buildConversationReplyToAddress } from '@app/modules/communications/email/utils/email-reply-to.util';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import {
  ConversationChannelAdapter,
  SendChannelMessageParams,
  SendChannelMessageResult,
} from '../conversation-channel-adapter.interface';

type PlatformEmailMetadata = {
  fromName?: string;
  fromAddress?: string;
};

@Injectable()
export class EmailMessagingAdapter implements ConversationChannelAdapter {
  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly resendProvider: ResendProviderService,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  getProviderKey(): string {
    return EMAIL_PROVIDER_KEY;
  }

  getChannel(): ConversationChannel {
    return ConversationChannel.EMAIL;
  }

  async sendMessage(
    params: SendChannelMessageParams,
  ): Promise<SendChannelMessageResult> {
    if (!this.resendProvider.isConfigured()) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Email sending is not configured on the platform.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resource = await this.integrationResourceRepository.findByIdAndBusiness(
      params.resourceId,
      params.businessId,
    );
    if (!resource) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Email channel resource not found.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata = (resource.metadata ?? {}) as PlatformEmailMetadata;
    const fromAddress = metadata.fromAddress?.trim();
    const fromName = metadata.fromName?.trim() || resource.name;
    if (!fromAddress) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Email from address is not configured for this business.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const conversationId =
      typeof params.metadata?.conversationId === 'string'
        ? params.metadata.conversationId
        : null;
    if (!conversationId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'conversationId is required for email messages.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const emailConfig = this.configService.get('email', { infer: true });
    const replyTo = buildConversationReplyToAddress(
      conversationId,
      params.businessId,
      emailConfig.platform.inboundDomain,
    );

    const subject =
      typeof params.metadata?.subject === 'string' && params.metadata.subject.trim()
        ? params.metadata.subject.trim()
        : `Message from ${fromName}`;

    const text = params.text?.trim() || '';
    const html = text
      .split('\n')
      .map((line) => line.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
      .join('<br />');

    const result = await this.resendProvider.send({
      from: `${fromName} <${fromAddress}>`,
      to: params.externalRecipientId,
      subject,
      html: html || '<p></p>',
      text: text || undefined,
      replyTo,
    });

    return {
      externalMessageId: result.providerMessageId,
      metadata: {
        replyTo,
        subject,
      },
    };
  }
}
