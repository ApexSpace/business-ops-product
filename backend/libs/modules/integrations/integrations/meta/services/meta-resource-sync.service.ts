import { Injectable, Logger } from '@nestjs/common';
import {
  IntegrationResourceType,
  type IntegrationResource,
} from '@prisma/client';
import { encryptIntegrationCredentials } from '@app/common/utils/integration-encryption.util';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { IntegrationResourceRepository } from '../../repositories/integration-resource.repository';
import {
  getMetaProviderConfig,
  META_INSTAGRAM_NO_ACCOUNTS_MESSAGE,
} from '../constants/meta-provider.config';
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
        await this.businessIntegrationRepository.update(
          businessId,
          providerKey,
          {
            errorMessage: META_INSTAGRAM_NO_ACCOUNTS_MESSAGE,
            lastSyncAt: new Date(),
          },
        );
        this.logger.warn(
          `[Instagram Sync] saved resources count=0 — no instagram_business_account on authorized Pages`,
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

    await this.ensureDefaultResources(integration.id, resources);

    await this.businessIntegrationRepository.update(businessId, providerKey, {
      lastSyncAt: new Date(),
      errorMessage: null,
    });

    return items.length;
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
      this.logger.log(
        `[Instagram Sync] starting fetchResources businessId=${businessId}`,
      );
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
}
