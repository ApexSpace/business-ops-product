import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationChannel } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import {
  ConversationChannelAdapter,
  SendChannelMessageParams,
  SendChannelMessageResult,
} from '../conversation-channel-adapter.interface';
import { getPageAccessTokenFromResource } from '../../utils/conversation-resource-token.util';
import { toMetaOutboundAttachments } from './meta-attachment.util';

@Injectable()
export class InstagramMessagingAdapter implements ConversationChannelAdapter {
  constructor(
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly metaApiClient: MetaApiClient,
    private readonly metaConfigService: MetaConfigService,
  ) {}

  getProviderKey(): string {
    return 'instagram';
  }

  getChannel(): ConversationChannel {
    return ConversationChannel.INSTAGRAM;
  }

  async sendMessage(
    params: SendChannelMessageParams,
  ): Promise<SendChannelMessageResult> {
    const resource =
      await this.integrationResourceRepository.findByIdAndBusiness(
        params.resourceId,
        params.businessId,
      );

    if (!resource || resource.providerKey !== this.getProviderKey()) {
      throw new AppException(
        ErrorCode.INTEGRATION_RESOURCE_NOT_FOUND,
        'Instagram account resource not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const accessToken = getPageAccessTokenFromResource(
      resource,
      this.metaConfigService.getEncryptionKey(),
    );

    if (!accessToken) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Instagram access token is missing. Sync your Instagram accounts and try again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const attachments = toMetaOutboundAttachments(params.attachments);

    const result = await this.metaApiClient.sendInstagramMessage(
      resource.externalId,
      accessToken,
      params.externalRecipientId,
      params.text,
      attachments,
    );

    return {
      externalMessageId: result.messageId || null,
      metadata: { instagramAccountId: resource.externalId },
    };
  }
}
