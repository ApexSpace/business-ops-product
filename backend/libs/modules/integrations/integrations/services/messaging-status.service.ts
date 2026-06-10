import { Injectable } from '@nestjs/common';
import { IntegrationResourceType, IntegrationStatus } from '@prisma/client';
import { getMetaScopesForProvider } from '../meta/constants/meta-provider.config';
import { BusinessIntegrationRepository } from '../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../repositories/integration-resource.repository';

export interface MessagingStatusDto {
  connected: boolean;
  defaultResourceSelected: boolean;
  webhookEndpointConfigured: boolean;
  requiredPermissionsPresent: boolean;
  readyForMessaging: boolean;
  warnings: string[];
}

const MESSAGING_PROVIDER_KEYS = new Set(['facebook', 'instagram']);
const WEBCHAT_PROVIDER_KEY = 'webchat';

@Injectable()
export class MessagingStatusService {
  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly integrationResourceRepository: IntegrationResourceRepository,
  ) {}

  async getMessagingStatus(
    businessId: string,
    providerKey: string,
  ): Promise<MessagingStatusDto> {
    const warnings: string[] = [];

    if (providerKey === WEBCHAT_PROVIDER_KEY) {
      return {
        connected: true,
        defaultResourceSelected: true,
        webhookEndpointConfigured: true,
        requiredPermissionsPresent: true,
        readyForMessaging: true,
        warnings: [],
      };
    }

    if (!MESSAGING_PROVIDER_KEYS.has(providerKey)) {
      return {
        connected: false,
        defaultResourceSelected: false,
        webhookEndpointConfigured: false,
        requiredPermissionsPresent: false,
        readyForMessaging: false,
        warnings: [
          'Messaging status is only available for Facebook and Instagram.',
        ],
      };
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );

    const connected = integration?.status === IntegrationStatus.CONNECTED;

    const resourceType =
      providerKey === 'facebook'
        ? IntegrationResourceType.FACEBOOK_PAGE
        : IntegrationResourceType.INSTAGRAM_ACCOUNT;

    const defaultResource =
      await this.integrationResourceRepository.findDefault(
        businessId,
        providerKey,
        resourceType,
      );

    const defaultResourceSelected = Boolean(defaultResource);

    if (connected && !defaultResourceSelected) {
      warnings.push(
        providerKey === 'facebook'
          ? 'Select a default Facebook Page to receive and send messages.'
          : 'Select a default Instagram account to receive and send messages.',
      );
    }

    const webhookVerifyToken = Boolean(
      process.env.META_WEBHOOK_VERIFY_TOKEN?.trim(),
    );
    const webhookEndpointConfigured = webhookVerifyToken;

    if (!webhookEndpointConfigured) {
      warnings.push(
        'Meta webhook verify token is not configured on the server (META_WEBHOOK_VERIFY_TOKEN).',
      );
    }

    const storedScopes = this.readStoredScopes(
      integration?.config,
      integration?.credentials,
    );
    const requiredScopes = getMetaScopesForProvider(providerKey);
    const requiredPermissionsPresent =
      storedScopes.length === 0 ||
      requiredScopes.every((scope) => storedScopes.includes(scope));

    if (connected && !requiredPermissionsPresent) {
      warnings.push(
        'Some messaging permissions may be missing. Reconnect and grant all requested permissions.',
      );
    }

    const pageTokenReady = defaultResource
      ? Boolean(
          (defaultResource.metadata as Record<string, unknown> | null)
            ?.pageAccessTokenStored,
        )
      : false;

    if (defaultResourceSelected && !pageTokenReady) {
      warnings.push(
        'Channel access token is missing. Sync resources after connecting.',
      );
    }

    const readyForMessaging =
      connected &&
      defaultResourceSelected &&
      webhookEndpointConfigured &&
      pageTokenReady;

    return {
      connected,
      defaultResourceSelected,
      webhookEndpointConfigured,
      requiredPermissionsPresent,
      readyForMessaging,
      warnings,
    };
  }

  private readStoredScopes(config: unknown, _credentials: unknown): string[] {
    if (!config || typeof config !== 'object') return [];
    const record = config as Record<string, unknown>;
    const scopes = record.scopes ?? record.grantedScopes;
    if (!Array.isArray(scopes)) return [];
    return scopes.filter((s): s is string => typeof s === 'string');
  }
}
