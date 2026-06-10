import { Injectable } from '@nestjs/common';
import { IntegrationResourceType } from '@prisma/client';
import { GoogleTokenService } from '@app/modules/integrations/integrations/services/google-token.service';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import { formatGoogleApiError } from '../../utils/google-api-error.util';
import { sleep } from '../../utils/sync-cooldown.util';
import {
  GOOGLE_BUSINESS_ACCOUNTS_URL,
  GOOGLE_BUSINESS_LOCATIONS_URL,
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

interface GoogleBusinessAccountsResponse {
  accounts?: Array<{
    name: string;
    accountName?: string;
    type?: string;
  }>;
}

interface GoogleBusinessLocationsResponse {
  locations?: Array<{
    name: string;
    title?: string;
    storefrontAddress?: {
      addressLines?: string[];
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
    };
  }>;
}

@Injectable()
export class GoogleBusinessProfileResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'google-business-profile';

  constructor(private readonly googleTokenService: GoogleTokenService) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const accessToken = await this.googleTokenService.getAccessToken(
      context.businessId,
      context.providerKey,
    );

    const accountsResponse = await fetch(GOOGLE_BUSINESS_ACCOUNTS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!accountsResponse.ok) {
      const detail = await accountsResponse.text();
      throw new Error(
        formatGoogleApiError(
          'Failed to fetch Google Business accounts',
          accountsResponse.status,
          detail,
        ),
      );
    }

    const accountsData =
      (await accountsResponse.json()) as GoogleBusinessAccountsResponse;
    const now = new Date();
    const items: UpsertIntegrationResourceInput[] = [];

    for (const account of accountsData.accounts ?? []) {
      const locationsUrl = `${GOOGLE_BUSINESS_LOCATIONS_URL}/${account.name}/locations?readMask=name,title,storefrontAddress`;
      const locationsResponse = await fetch(locationsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!locationsResponse.ok) {
        const detail = await locationsResponse.text();
        if (locationsResponse.status === 429) {
          throw new Error(
            formatGoogleApiError(
              'Failed to fetch Google Business locations',
              locationsResponse.status,
              detail,
            ),
          );
        }
        continue;
      }

      const locationsData =
        (await locationsResponse.json()) as GoogleBusinessLocationsResponse;

      for (const location of locationsData.locations ?? []) {
        const address = location.storefrontAddress;
        const addressLine = address
          ? [
              ...(address.addressLines ?? []),
              address.locality,
              address.administrativeArea,
              address.postalCode,
            ]
              .filter(Boolean)
              .join(', ')
          : null;

        items.push({
          externalId: location.name,
          name: location.title ?? location.name,
          type: IntegrationResourceType.GBP_LOCATION,
          metadata: {
            accountName: account.accountName ?? account.name,
            accountType: account.type ?? null,
            address: addressLine,
          },
          lastSyncedAt: now,
        });
      }

      // GBP location API has strict per-minute quotas — pace multi-account fetches.
      await sleep(800);
    }

    return { items, synced: true };
  }
}
