import { Injectable, Logger } from '@nestjs/common';
import {
  IntegrationResourceType,
  type IntegrationResource,
} from '@prisma/client';
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from '@app/common/utils/integration-encryption.util';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../repositories/integration-resource.repository';
import {
  getMetaProviderConfig,
  META_FACEBOOK_NO_PAGES_MESSAGE,
  META_INSTAGRAM_DIRECT_NO_ACCOUNT_MESSAGE,
  META_INSTAGRAM_NO_ACCOUNTS_MESSAGE,
  parseMetaInstagramAuthFlow,
  type MetaInstagramAuthFlow,
} from '../constants/meta-provider.config';
import { META_INSTAGRAM_APP_WEBHOOK_FIELDS } from '../constants/meta-messaging-webhook.constants';
import { MetaApiClient } from './meta-api-client';
import { MetaConfigService } from './meta-config.service';
import { MetaTokenService } from './meta-token.service';

@Injectable()
export class MetaResourceSyncService {
  private readonly logger = new Logger(MetaResourceSyncService.name);

  constructor(
    private readonly metaApiClient: MetaApiClient,
    private readonly metaTokenService: MetaTokenService,
    private readonly metaConfigService: MetaConfigService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly resourceRepository: IntegrationResourceRepository,
  ) {}

  async syncAfterConnect(
    businessId: string,
    providerKey: string,
  ): Promise<number> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        businessId,
        providerKey,
      );
    if (!integration) return 0;

    const items = await this.fetchResources(businessId, providerKey);

    if (items.length === 0) {
      if (providerKey === 'instagram') {
        const authFlow = readAuthFlowFromIntegrationConfig(integration.config);
        await this.businessIntegrationRepository.update(
          businessId,
          providerKey,
          {
            errorMessage:
              authFlow === 'INSTAGRAM_LOGIN'
                ? META_INSTAGRAM_DIRECT_NO_ACCOUNT_MESSAGE
                : META_INSTAGRAM_NO_ACCOUNTS_MESSAGE,
            lastSyncAt: new Date(),
          },
        );
        this.logger.warn(
          `[Instagram Sync] saved resources count=0 authFlow=${authFlow}`,
        );
      } else if (providerKey === 'facebook') {
        await this.businessIntegrationRepository.update(
          businessId,
          providerKey,
          {
            errorMessage: META_FACEBOOK_NO_PAGES_MESSAGE,
            lastSyncAt: new Date(),
          },
        );
        this.logger.warn(
          `[Facebook Sync] saved resources count=0 — /me/accounts returned no Pages`,
        );
      }
      return 0;
    }

    const resources = await this.resourceRepository.upsertMany(
      integration.id,
      businessId,
      providerKey,
      items,
    );

    await this.resourceRepository.deactivateMissingExternalIds(
      integration.id,
      items.map((item) => item.externalId),
    );

    await this.ensureDefaultResources(integration.id, resources);

    if (providerKey === 'whatsapp') {
      await this.ensureWhatsAppWebhookSubscriptions(businessId, items);
    } else if (providerKey === 'facebook' || providerKey === 'instagram') {
      await this.ensureMessagingWebhookSubscriptions(
        businessId,
        providerKey,
        items,
      );
    }

    await this.businessIntegrationRepository.update(businessId, providerKey, {
      lastSyncAt: new Date(),
      errorMessage: null,
    });

    return items.length;
  }

  private async ensureWhatsAppWebhookSubscriptions(
    businessId: string,
    items: UpsertIntegrationResourceInput[],
  ): Promise<void> {
    const wabaIds = new Set<string>();
    for (const item of items) {
      const wabaId = readMetadataString(item.metadata, 'wabaId');
      if (wabaId) {
        wabaIds.add(wabaId);
      }
    }

    if (wabaIds.size === 0) {
      return;
    }

    let accessToken: string;
    try {
      accessToken = await this.metaTokenService.getAccessToken(
        businessId,
        'whatsapp',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Missing WhatsApp token';
      this.logger.warn(
        `WhatsApp webhook subscription skipped for business ${businessId}: ${message}`,
      );
      return;
    }

    for (const wabaId of wabaIds) {
      try {
        const subscribed =
          await this.metaApiClient.subscribeWhatsAppBusinessAccountToApp(
            wabaId,
            accessToken,
          );
        this.logger.log(
          `WhatsApp webhook subscription wabaId=${wabaId} businessId=${businessId} success=${subscribed}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Subscription failed';
        this.logger.warn(
          `WhatsApp webhook subscription failed wabaId=${wabaId} businessId=${businessId}: ${message}`,
        );
      }
    }
  }

  private async ensureDefaultResources(
    _businessIntegrationId: string,
    resources: IntegrationResource[],
  ): Promise<void> {
    const byType = new Map<IntegrationResourceType, IntegrationResource[]>();
    for (const resource of resources) {
      const list = byType.get(resource.type) ?? [];
      list.push(resource);
      byType.set(resource.type, list);
    }

    for (const [, group] of byType) {
      const hasDefault = group.some((r) => r.isDefault);
      if (!hasDefault && group.length > 0) {
        await this.resourceRepository.update(group[0].id, {
          isDefault: true,
          isSelected: true,
        });
      }
    }
  }

  async fetchResources(
    businessId: string,
    providerKey: string,
  ): Promise<UpsertIntegrationResourceInput[]> {
    const config = getMetaProviderConfig(providerKey);
    if (!config) {
      this.logger.warn(
        `Meta resource sync skipped: unknown providerKey=${providerKey}`,
      );
      return [];
    }

    const accessToken = await this.metaTokenService.getAccessToken(
      businessId,
      providerKey,
    );
    const now = new Date();

    let items: UpsertIntegrationResourceInput[] = [];

    if (providerKey === 'facebook') {
      const pages = await this.metaApiClient.listPages(accessToken);
      items = pages.map((page) => ({
        externalId: page.id,
        name: page.name,
        type: IntegrationResourceType.FACEBOOK_PAGE,
        metadata: {
          category: page.category ?? null,
          pictureUrl: page.picture?.data?.url ?? null,
          tasks: page.tasks ?? [],
          pageAccessTokenStored: Boolean(page.access_token),
          ...(page.access_token
            ? {
                pageAccessTokenEncrypted: encryptIntegrationCredentials(
                  this.metaConfigService.getEncryptionKey(),
                  { pageAccessToken: page.access_token },
                ),
              }
            : {}),
        },
        lastSyncedAt: now,
      }));
    } else if (providerKey === 'instagram') {
      const integration =
        await this.businessIntegrationRepository.findByBusinessAndKey(
          businessId,
          providerKey,
        );
      const authFlow = readAuthFlowFromIntegrationConfig(integration?.config);
      this.logger.log(
        `[Instagram Sync] starting fetchResources businessId=${businessId} authFlow=${authFlow}`,
      );

      if (authFlow === 'INSTAGRAM_LOGIN') {
        items = await this.fetchInstagramLoginResources(accessToken, now);
      } else {
        const pages = await this.metaApiClient.listPages(accessToken);
        const accounts = await this.metaApiClient.listInstagramAccounts(
          accessToken,
          pages,
        );
        items = accounts.map((account) => ({
          externalId: account.id,
          name: account.username ?? account.name ?? account.linkedPageName,
          type: IntegrationResourceType.INSTAGRAM_ACCOUNT,
          metadata: {
            username: account.username ?? null,
            displayName: account.name ?? null,
            linkedPageId: account.linkedPageId,
            linkedPageName: account.linkedPageName,
            profilePictureUrl: account.profile_picture_url ?? null,
            authFlow: 'FACEBOOK_LOGIN',
            pageAccessTokenStored: Boolean(account.pageAccessToken),
            ...(account.pageAccessToken
              ? {
                  pageAccessTokenEncrypted: encryptIntegrationCredentials(
                    this.metaConfigService.getEncryptionKey(),
                    { pageAccessToken: account.pageAccessToken },
                  ),
                }
              : {}),
          },
          lastSyncedAt: now,
        }));
      }
      this.logger.log(`[Instagram Sync] saved resources count=${items.length}`);
    } else if (providerKey === 'whatsapp') {
      const wabas =
        await this.metaApiClient.listWhatsAppBusinessAccounts(accessToken);

      for (const waba of wabas) {
        for (const phone of waba.phoneNumbers) {
          items.push({
            externalId: phone.id,
            name: phone.verified_name ?? phone.display_phone_number ?? phone.id,
            type: IntegrationResourceType.PHONE_NUMBER,
            metadata: {
              wabaId: waba.id,
              wabaName: waba.name ?? null,
              phoneNumberId: phone.id,
              displayPhoneNumber: phone.display_phone_number ?? null,
              verifiedName: phone.verified_name ?? null,
              qualityRating: phone.quality_rating ?? null,
              messagingLimit: phone.messaging_limit_tier ?? null,
            },
            lastSyncedAt: now,
          });
        }
      }
    }

    const allowedTypes = new Set(config.resourceTypes);
    const filtered = items.filter((item) => {
      if (allowedTypes.has(item.type)) {
        return true;
      }
      this.logger.warn(
        `Meta resource sync skipped wrong type providerKey=${providerKey} resourceType=${item.type}`,
      );
      return false;
    });

    this.logger.log(
      `Meta resource sync providerKey=${providerKey} resourceCount=${filtered.length}`,
    );

    return filtered;
  }

  private async fetchInstagramLoginResources(
    accessToken: string,
    now: Date,
  ): Promise<UpsertIntegrationResourceInput[]> {
    const profile =
      await this.metaApiClient.getInstagramLoginProfile(accessToken);
    return [
      {
        externalId: profile.id,
        name: profile.username ?? profile.name ?? profile.id,
        type: IntegrationResourceType.INSTAGRAM_ACCOUNT,
        metadata: {
          username: profile.username ?? null,
          displayName: profile.name ?? null,
          linkedPageId: null,
          linkedPageName: null,
          profilePictureUrl: profile.profile_picture_url ?? null,
          authFlow: 'INSTAGRAM_LOGIN',
          graphHost: 'graph.instagram.com',
          pageAccessTokenStored: false,
        },
        lastSyncedAt: now,
        isSelected: true,
        isDefault: true,
      },
    ];
  }

  /**
   * Subscribes linked Facebook Pages (and the app for Instagram) to Meta messaging webhooks.
   * WhatsApp uses WABA subscription instead; see ensureWhatsAppWebhookSubscriptions.
   * Direct Instagram Login has no Page token — skip Page subscribed_apps, keep app-level IG webhooks.
   */
  async ensureMessagingWebhookSubscriptions(
    businessId: string,
    providerKey: 'facebook' | 'instagram',
    items: UpsertIntegrationResourceInput[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const encryptionKey = this.metaConfigService.getEncryptionKey();
    const pageSubscriptions = new Map<string, string>();

    for (const item of items) {
      const authFlow = readMetadataString(item.metadata, 'authFlow');
      if (authFlow === 'INSTAGRAM_LOGIN') {
        continue;
      }

      const pageId =
        providerKey === 'facebook'
          ? item.externalId
          : readMetadataString(item.metadata, 'linkedPageId');
      const pageAccessToken = readPageAccessTokenFromItemMetadata(
        encryptionKey,
        item.metadata,
      );

      if (pageId && pageAccessToken) {
        pageSubscriptions.set(pageId, pageAccessToken);
      }
    }

    for (const [pageId, pageAccessToken] of pageSubscriptions) {
      try {
        const subscribed =
          await this.metaApiClient.subscribePageToMessagingWebhooks(
            pageId,
            pageAccessToken,
          );
        this.logger.log(
          `Page messaging webhook subscription pageId=${pageId} businessId=${businessId} providerKey=${providerKey} success=${subscribed}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Subscription failed';
        this.logger.warn(
          `Page messaging webhook subscription failed pageId=${pageId} businessId=${businessId} providerKey=${providerKey}: ${message}`,
        );
      }
    }

    if (providerKey === 'instagram') {
      await this.ensureInstagramAppWebhookSubscription(businessId);
    }
  }

  /** Registers Instagram object webhooks on the Meta app (same callback URL as Messenger). */
  private async ensureInstagramAppWebhookSubscription(
    businessId: string,
  ): Promise<void> {
    const config = this.metaConfigService.describeMetaWebhookCallbackConfig();

    if (!config.secure || !config.callbackUrl) {
      this.logger.warn(
        `Instagram app webhook subscription skipped businessId=${businessId}: ` +
          `callbackUrl=${config.callbackUrl ?? 'unset'} ` +
          `explicitCallback=${config.explicitCallbackConfigured} ` +
          `verifyToken=${config.verifyTokenConfigured}. ` +
          `Set META_WEBHOOK_CALLBACK_URL=https://fb-login.codesoltech.com/api/v1/webhooks/meta and restart the API and worker processes.`,
      );
      return;
    }

    if (!config.verifyTokenConfigured) {
      this.logger.warn(
        `Instagram app webhook subscription skipped businessId=${businessId}: META_WEBHOOK_VERIFY_TOKEN is not set.`,
      );
      return;
    }

    try {
      const subscribed = await this.metaApiClient.ensureAppWebhookSubscription(
        'instagram',
        META_INSTAGRAM_APP_WEBHOOK_FIELDS,
      );
      this.logger.log(
        `Instagram app webhook subscription businessId=${businessId} callback=${config.callbackUrl} success=${subscribed}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Subscription failed';
      this.logger.warn(
        `Instagram app webhook subscription failed businessId=${businessId}: ${message}`,
      );
    }
  }
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readPageAccessTokenFromItemMetadata(
  encryptionKey: string,
  metadata: unknown,
): string | null {
  const encrypted = readMetadataString(metadata, 'pageAccessTokenEncrypted');
  if (!encrypted) {
    return null;
  }

  const decrypted = decryptIntegrationCredentials(encryptionKey, encrypted) as {
    pageAccessToken?: string;
  };
  return decrypted.pageAccessToken?.trim() || null;
}

function readAuthFlowFromIntegrationConfig(
  config: unknown,
): MetaInstagramAuthFlow {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return 'FACEBOOK_LOGIN';
  }
  const authFlow = (config as Record<string, unknown>).authFlow;
  if (typeof authFlow === 'string') {
    return parseMetaInstagramAuthFlow(authFlow);
  }
  return 'FACEBOOK_LOGIN';
}
