import { Injectable } from '@nestjs/common';
import {
  IntegrationResourceType,
  IntegrationStatus,
} from '@prisma/client';
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

const MESSAGING_PROVIDER_KEYS = new Set([
  'facebook',
  'instagram',
  'whatsapp',
]);
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
          'Messaging status is only available for Facebook, Instagram, and WhatsApp.',
        ],
      };
    }

    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );

    const connected = integration?.status === IntegrationStatus.CONNECTED;

    if (!connected) {
      warnings.push(this.connectWarning(providerKey));
    }

    const resourceType = this.resolveResourceType(providerKey);

    const defaultResource =
      await this.integrationResourceRepository.findDefault(
        businessId,
        providerKey,
        resourceType,
      );

    const defaultResourceSelected = Boolean(defaultResource);

    if (connected && !defaultResourceSelected) {
      warnings.push(this.defaultResourceWarning(providerKey));
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

    const tokenReady = this.isTokenReady(
      providerKey,
      integration,
      defaultResource,
    );

    if (connected && defaultResourceSelected && !tokenReady) {
      warnings.push(this.tokenWarning(providerKey));
    }

    const readyForMessaging =
      connected &&
      defaultResourceSelected &&
      webhookEndpointConfigured &&
      tokenReady;

    return {
      connected,
      defaultResourceSelected,
      webhookEndpointConfigured,
      requiredPermissionsPresent,
      readyForMessaging,
      warnings,
    };
  }

  private resolveResourceType(providerKey: string): IntegrationResourceType {
    if (providerKey === 'facebook') {
      return IntegrationResourceType.FACEBOOK_PAGE;
    }
    if (providerKey === 'whatsapp') {
      return IntegrationResourceType.PHONE_NUMBER;
    }
    return IntegrationResourceType.INSTAGRAM_ACCOUNT;
  }

  private isTokenReady(
    providerKey: string,
    integration: { credentials?: unknown } | null | undefined,
    defaultResource: { metadata?: unknown } | null | undefined,
  ): boolean {
    if (providerKey === 'whatsapp') {
      const credentials = integration?.credentials as {
        encrypted?: string;
      } | null;
      return Boolean(credentials?.encrypted);
    }

    return defaultResource
      ? Boolean(
          (defaultResource.metadata as Record<string, unknown> | null)
            ?.pageAccessTokenStored,
        )
      : false;
  }

  private connectWarning(providerKey: string): string {
    if (providerKey === 'facebook') {
      return 'Connect Facebook in Business Settings → Integrations before messaging.';
    }
    if (providerKey === 'whatsapp') {
      return 'Connect WhatsApp in Business Settings → Integrations before messaging.';
    }
    return 'Connect Instagram in Business Settings → Integrations before messaging.';
  }

  private defaultResourceWarning(providerKey: string): string {
    if (providerKey === 'facebook') {
      return 'Select a default Facebook Page to receive and send messages.';
    }
    if (providerKey === 'whatsapp') {
      return 'Select a default WhatsApp phone number to receive and send messages.';
    }
    return 'Select a default Instagram account to receive and send messages.';
  }

  private tokenWarning(providerKey: string): string {
    if (providerKey === 'whatsapp') {
      return 'WhatsApp access token is missing. Reconnect WhatsApp and try again.';
    }
    return 'Channel access token is missing. Sync resources after connecting.';
  }

  private readStoredScopes(config: unknown, _credentials: unknown): string[] {
    if (!config || typeof config !== 'object') return [];
    const record = config as Record<string, unknown>;
    const scopes = record.scopes ?? record.grantedScopes;
    if (!Array.isArray(scopes)) return [];
    return scopes.filter((s): s is string => typeof s === 'string');
  }
}
