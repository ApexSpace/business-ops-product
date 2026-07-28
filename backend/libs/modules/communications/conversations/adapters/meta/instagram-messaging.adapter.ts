import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationChannel, type IntegrationResource } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { META_INSTAGRAM_LOGIN_AUTH_SCOPES } from '@app/modules/integrations/integrations/meta/constants/meta-provider.config';
import { MetaApiClient } from '@app/modules/integrations/integrations/meta/services/meta-api-client';
import { MetaConfigService } from '@app/modules/integrations/integrations/meta/services/meta-config.service';
import { MetaTokenService } from '@app/modules/integrations/integrations/meta/services/meta-token.service';
import { BusinessIntegrationRepository } from '@app/modules/integrations/integrations/repositories/business-integration.repository';
import { IntegrationResourceRepository } from '@app/modules/integrations/integrations/repositories/integration-resource.repository';
import {
  ConversationChannelAdapter,
  SendChannelMessageParams,
  SendChannelMessageResult,
} from '../conversation-channel-adapter.interface';
import { getPageAccessTokenFromResource } from '../../utils/conversation-resource-token.util';
import { toMetaOutboundAttachments } from './meta-attachment.util';

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isInstagramLoginResource(metadata: unknown): boolean {
  return readMetadataString(metadata, 'authFlow') === 'INSTAGRAM_LOGIN';
}

function readAuthFlowFromConfig(config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return null;
  }
  const value = (config as Record<string, unknown>).authFlow;
  return typeof value === 'string' ? value : null;
}

@Injectable()
export class InstagramMessagingAdapter implements ConversationChannelAdapter {
  constructor(
    private readonly integrationResourceRepository: IntegrationResourceRepository,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly metaApiClient: MetaApiClient,
    private readonly metaConfigService: MetaConfigService,
    private readonly metaTokenService: MetaTokenService,
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

    const attachments = toMetaOutboundAttachments(params.attachments);

    if (
      isInstagramLoginResource(resource.metadata) ||
      (await this.isInstagramLoginIntegration(params.businessId))
    ) {
      return this.sendViaInstagramLogin(params, resource, attachments);
    }

    return this.sendViaFacebookLogin(params, resource, attachments);
  }

  private async isInstagramLoginIntegration(
    businessId: string,
  ): Promise<boolean> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        'instagram',
      );
    return readAuthFlowFromConfig(integration?.config) === 'INSTAGRAM_LOGIN';
  }

  private async sendViaInstagramLogin(
    params: SendChannelMessageParams,
    resource: IntegrationResource,
    attachments: Array<{ type: string; url: string }>,
  ): Promise<SendChannelMessageResult> {
    const credentials = await this.metaTokenService.getStoredCredentials(
      params.businessId,
      'instagram',
    );

    const scopes = new Set(credentials.scopes.map((s) => s.toLowerCase()));
    const hasMessagingScope = META_INSTAGRAM_LOGIN_AUTH_SCOPES.some((scope) =>
      scopes.has(scope.toLowerCase()),
    );
    if (!hasMessagingScope && !scopes.has('instagram_business_manage_messages')) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Direct Instagram connection is missing messaging permission. Reconnect Instagram and grant message access.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const igUserId =
      credentials.instagramUserId?.trim() || resource.externalId;
    const result = await this.metaApiClient.sendInstagramLoginMessage(
      igUserId,
      credentials.accessToken,
      params.externalRecipientId,
      params.text,
      attachments,
    );

    return {
      externalMessageId: result.messageId || null,
      metadata: {
        instagramAccountId: resource.externalId,
        authFlow: 'INSTAGRAM_LOGIN',
      },
    };
  }

  private async sendViaFacebookLogin(
    params: SendChannelMessageParams,
    resource: IntegrationResource,
    attachments: Array<{ type: string; url: string }>,
  ): Promise<SendChannelMessageResult> {
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

    const linkedPageId = readMetadataString(resource.metadata, 'linkedPageId');
    if (!linkedPageId) {
      throw new AppException(
        ErrorCode.CONVERSATION_CHANNEL_NOT_READY,
        'Linked Facebook Page ID is missing for this Instagram account. Sync your Instagram accounts and try again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.metaApiClient.sendInstagramMessage(
      linkedPageId,
      accessToken,
      params.externalRecipientId,
      params.text,
      attachments,
    );

    return {
      externalMessageId: result.messageId || null,
      metadata: {
        instagramAccountId: resource.externalId,
        linkedPageId,
        authFlow: 'FACEBOOK_LOGIN',
      },
    };
  }
}
