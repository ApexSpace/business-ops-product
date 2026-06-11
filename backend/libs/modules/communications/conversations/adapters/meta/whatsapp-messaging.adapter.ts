import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaTokenService } from '@app/modules/integrations/integrations/meta/services/meta-token.service';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import {
  ConversationChannelAdapter,
  SendChannelMessageParams,
  SendChannelMessageResult,
} from '../conversation-channel-adapter.interface';
import { toMetaOutboundAttachments } from './meta-attachment.util';

@Injectable()
export class WhatsAppMessagingAdapter implements ConversationChannelAdapter {
  constructor(
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly metaApiClient: MetaApiClient,
    private readonly metaTokenService: MetaTokenService,
  ) {}

  getProviderKey(): string {
    return 'whatsapp';
  }

  getChannel(): ConversationChannel {
    return ConversationChannel.WHATSAPP;
  }

  async sendMessage(
    params: SendChannelMessageParams,
  ): Promise<SendChannelMessageResult> {
    const resource = await this.integrationResourceRepository.findByIdAndBusiness(
      params.resourceId,
      params.businessId,
    );

    if (!resource || resource.providerKey !== this.getProviderKey()) {
      throw new AppException(
        ErrorCode.INTEGRATION_RESOURCE_NOT_FOUND,
        'WhatsApp phone number resource not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    let accessToken: string;
    try {
      accessToken = await this.metaTokenService.getAccessToken(
        params.businessId,
        this.getProviderKey(),
      );
    } catch {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'WhatsApp access token is missing. Connect WhatsApp and try again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const attachments = toMetaOutboundAttachments(params.attachments);

    const result = await this.metaApiClient.sendWhatsAppMessage(
      resource.externalId,
      accessToken,
      params.externalRecipientId,
      params.text,
      attachments,
    );

    return {
      externalMessageId: result.messageId || null,
      metadata: { phoneNumberId: resource.externalId },
    };
  }
}
