import { Injectable } from '@nestjs/common';
import { IntegrationResourceType, IntegrationStatus } from '@prisma/client';
import { decryptIntegrationCredentials } from '@app/common/utils/integration-encryption.util';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import {
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

const LINKEDIN_ORG_ACL_URL =
  'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget~(id,localizedName)))';

interface LinkedInOrgAclResponse {
  elements?: Array<{
    'organizationalTarget~'?: {
      id?: number | string;
      localizedName?: string;
    };
  }>;
}

@Injectable()
export class LinkedInResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'linkedin';

  constructor(
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
  ) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const integration =
      await this.businessIntegrationRepository.findByBusinessAndKey(
        context.businessId,
        context.providerKey,
      );

    if (!integration || integration.status !== IntegrationStatus.CONNECTED) {
      return { items: [], synced: false };
    }

    const stored = integration.credentials as { encrypted?: string } | null;
    if (!stored?.encrypted) {
      return { items: [], synced: false };
    }

    const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Integration encryption key is not configured');
    }

    const credentials = decryptIntegrationCredentials(
      encryptionKey,
      stored.encrypted,
    ) as { accessToken?: string };

    if (!credentials.accessToken) {
      return { items: [], synced: false };
    }

    const response = await fetch(LINKEDIN_ORG_ACL_URL, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Failed to fetch LinkedIn organizations (${response.status}): ${detail}`,
      );
    }

    const data = (await response.json()) as LinkedInOrgAclResponse;
    const now = new Date();
    const items: UpsertIntegrationResourceInput[] = [];

    for (const element of data.elements ?? []) {
      const org = element['organizationalTarget~'];
      if (!org?.id) continue;
      items.push({
        externalId: String(org.id),
        name: org.localizedName ?? `Organization ${org.id}`,
        type: IntegrationResourceType.LINKEDIN_ORGANIZATION,
        metadata: { urn: `urn:li:organization:${org.id}` },
        lastSyncedAt: now,
        isSelected: items.length === 0,
        isDefault: items.length === 0,
      });
    }

    return { items, synced: true };
  }
}
