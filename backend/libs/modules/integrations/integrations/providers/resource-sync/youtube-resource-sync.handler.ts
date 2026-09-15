import { Injectable } from '@nestjs/common';
import { IntegrationResourceType } from '@prisma/client';
import { GoogleTokenService } from '@app/modules/integrations/integrations/services/google-token.service';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import {
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

const YOUTUBE_CHANNELS_URL =
  'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true';

interface YouTubeChannelsResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      customUrl?: string;
      thumbnails?: { default?: { url?: string } };
    };
  }>;
}

@Injectable()
export class YouTubeResourceSyncHandler implements IntegrationResourceSyncHandler {
  readonly providerKey = 'youtube';

  constructor(private readonly googleTokenService: GoogleTokenService) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const accessToken = await this.googleTokenService.getAccessToken(
      context.businessId,
      context.providerKey,
    );

    const response = await fetch(YOUTUBE_CHANNELS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Failed to fetch YouTube channels (${response.status}): ${detail}`,
      );
    }

    const data = (await response.json()) as YouTubeChannelsResponse;
    const now = new Date();

    // Omit isSelected/isDefault so re-sync preserves user channel picks;
    // ensureDefaultResource sets defaults only when none exist.
    const items: UpsertIntegrationResourceInput[] = (data.items ?? []).map(
      (channel) => ({
        externalId: channel.id,
        name: channel.snippet?.title ?? channel.id,
        type: IntegrationResourceType.YOUTUBE_CHANNEL,
        metadata: {
          description: channel.snippet?.description ?? null,
          customUrl: channel.snippet?.customUrl ?? null,
          thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null,
        },
        lastSyncedAt: now,
      }),
    );

    return { items, synced: true };
  }
}
