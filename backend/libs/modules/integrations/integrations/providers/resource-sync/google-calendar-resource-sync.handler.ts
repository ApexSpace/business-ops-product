import { Injectable } from '@nestjs/common';
import { IntegrationResourceType } from '@prisma/client';
import { GoogleTokenService } from '@app/modules/integrations/integrations/services/google-token.service';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import {
  GOOGLE_CALENDAR_LIST_URL,
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

interface GoogleCalendarListResponse {
  items?: Array<{
    id: string;
    summary?: string;
    description?: string;
    primary?: boolean;
    accessRole?: string;
    timeZone?: string;
  }>;
}

@Injectable()
export class GoogleCalendarResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'google-calendar';

  constructor(private readonly googleTokenService: GoogleTokenService) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const accessToken = await this.googleTokenService.getAccessToken(
      context.businessId,
      context.providerKey,
    );

    const response = await fetch(GOOGLE_CALENDAR_LIST_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Failed to fetch Google calendars (${response.status}): ${detail}`,
      );
    }

    const data = (await response.json()) as GoogleCalendarListResponse;
    const now = new Date();

    const items: UpsertIntegrationResourceInput[] = (data.items ?? []).map(
      (calendar) => ({
        externalId: calendar.id,
        name: calendar.summary ?? calendar.id,
        type: IntegrationResourceType.CALENDAR,
        metadata: {
          description: calendar.description ?? null,
          primary: calendar.primary ?? false,
          accessRole: calendar.accessRole ?? null,
          timeZone: calendar.timeZone ?? null,
        },
        lastSyncedAt: now,
      }),
    );

    return { items, synced: true };
  }
}
