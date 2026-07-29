import { Injectable, Logger } from '@nestjs/common';
import { IntegrationResourceType } from '@prisma/client';
import {
  GOOGLE_BUSINESS_MANAGE_SCOPE_MISSING_MESSAGE,
  googleTokenHasBusinessManageScope,
} from '@app/modules/integrations/integrations/constants/google-oauth.constants';
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

interface GoogleBusinessAccount {
  name: string;
  accountName?: string;
  type?: string;
}

interface GoogleBusinessAccountsResponse {
  accounts?: GoogleBusinessAccount[];
  nextPageToken?: string;
}

interface GoogleBusinessLocation {
  name: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
}

interface GoogleBusinessLocationsResponse {
  locations?: GoogleBusinessLocation[];
  nextPageToken?: string;
}

const LOCATION_READ_MASK = 'name,title,storefrontAddress';
const PAGE_SIZE = 100;
/** Lists locations the user owns or manages (including indirect access). */
const ALL_ACCESSIBLE_LOCATIONS_PARENT = 'accounts/-';

@Injectable()
export class GoogleBusinessProfileResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'google-business-profile';
  private readonly logger = new Logger(
    GoogleBusinessProfileResourceSyncHandler.name,
  );

  constructor(private readonly googleTokenService: GoogleTokenService) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const credentials = await this.googleTokenService.getStoredCredentials(
      context.businessId,
      context.providerKey,
    );

    if (!googleTokenHasBusinessManageScope(credentials.scope)) {
      throw new Error(GOOGLE_BUSINESS_MANAGE_SCOPE_MISSING_MESSAGE);
    }

    const accessToken = credentials.accessToken;
    const now = new Date();
    const itemsByExternalId = new Map<string, UpsertIntegrationResourceInput>();
    const locationErrors: string[] = [];

    const accounts = await this.listAllAccounts(accessToken);

    // Prefer per-account listing (owners + managers appear as separate accounts).
    for (const account of accounts) {
      try {
        const locations = await this.listAllLocations(
          accessToken,
          account.name,
        );
        for (const location of locations) {
          itemsByExternalId.set(
            location.name,
            this.toResourceItem(location, account, now),
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Location fetch failed';
        locationErrors.push(message);
        this.logger.warn(
          `GBP location sync failed account=${account.name} businessId=${context.businessId}: ${message}`,
        );
      }

      await sleep(800);
    }

    // Also list accounts/- which includes indirectly managed locations
    // (manager access granted by the business owner), similar to Facebook Pages.
    try {
      const sharedLocations = await this.listAllLocations(
        accessToken,
        ALL_ACCESSIBLE_LOCATIONS_PARENT,
      );
      for (const location of sharedLocations) {
        if (itemsByExternalId.has(location.name)) {
          continue;
        }
        itemsByExternalId.set(
          location.name,
          this.toResourceItem(
            location,
            {
              name: ALL_ACCESSIBLE_LOCATIONS_PARENT,
              accountName: 'Managed locations',
              type: 'MANAGED',
            },
            now,
          ),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Managed location fetch failed';
      locationErrors.push(message);
      this.logger.warn(
        `GBP accounts/- location sync failed businessId=${context.businessId}: ${message}`,
      );
    }

    const items = [...itemsByExternalId.values()];

    if (items.length === 0 && locationErrors.length > 0) {
      throw new Error(locationErrors[0]);
    }

    if (items.length === 0 && accounts.length === 0) {
      throw new Error(
        'No Google Business Profile accounts were returned. Sign in with a Google account that owns or manages the Business Profile (manager access from the owner is supported), and confirm GBP API access is approved for your Google Cloud project.',
      );
    }

    if (items.length === 0) {
      throw new Error(
        'No locations were found for the connected Google account. If an owner invited you as a manager, confirm the invite is accepted in Google Business Profile, then Sync again.',
      );
    }

    return { items, synced: true };
  }

  private async listAllAccounts(
    accessToken: string,
  ): Promise<GoogleBusinessAccount[]> {
    const accounts: GoogleBusinessAccount[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(GOOGLE_BUSINESS_ACCOUNTS_URL);
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          formatGoogleApiError(
            'Failed to fetch Google Business accounts',
            response.status,
            detail,
          ),
        );
      }

      const data = (await response.json()) as GoogleBusinessAccountsResponse;
      accounts.push(...(data.accounts ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return accounts;
  }

  private async listAllLocations(
    accessToken: string,
    accountName: string,
  ): Promise<GoogleBusinessLocation[]> {
    const locations: GoogleBusinessLocation[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(
        `${GOOGLE_BUSINESS_LOCATIONS_URL}/${accountName}/locations`,
      );
      url.searchParams.set('readMask', LOCATION_READ_MASK);
      url.searchParams.set('pageSize', String(PAGE_SIZE));
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken);
      }

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          formatGoogleApiError(
            'Failed to fetch Google Business locations',
            response.status,
            detail,
          ),
        );
      }

      const data = (await response.json()) as GoogleBusinessLocationsResponse;
      locations.push(...(data.locations ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return locations;
  }

  private toResourceItem(
    location: GoogleBusinessLocation,
    account: GoogleBusinessAccount,
    now: Date,
  ): UpsertIntegrationResourceInput {
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

    return {
      externalId: location.name,
      name: location.title ?? location.name,
      type: IntegrationResourceType.GBP_LOCATION,
      metadata: {
        accountName: account.accountName ?? account.name,
        accountType: account.type ?? null,
        address: addressLine,
      },
      lastSyncedAt: now,
    };
  }
}
