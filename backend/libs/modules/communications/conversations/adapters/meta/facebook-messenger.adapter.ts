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

@Injectable()
export class FacebookMessengerAdapter implements ConversationChannelAdapter {
  constructor(
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly metaApiClient: MetaApiClient,
    private readonly metaConfigService: MetaConfigService,
  ) {}

  getProviderKey(): string {
    return 'facebook';
  }

  getChannel(): ConversationChannel {
    return ConversationChannel.FACEBOOK;
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
        'Facebook Page resource not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pageAccessToken = getPageAccessTokenFromResource(
      resource,
      this.metaConfigService.getEncryptionKey(),
    );

    if (!pageAccessToken) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Facebook Page access token is missing. Sync your Facebook Pages and try again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.metaApiClient.sendMessengerMessage(
      resource.externalId,
      pageAccessToken,
      params.externalRecipientId,
      params.text,
    );

    return {
      externalMessageId: result.messageId || null,
      metadata: { pageId: resource.externalId },
    };
  }
}
