import { Injectable } from '@nestjs/common';
import { IntegrationResourceType } from '@prisma/client';
import { getPinterestBoardsUrl } from '../../constants/pinterest-api.constants';
import { PinterestTokenService } from '../../services/pinterest-token.service';
import { UpsertIntegrationResourceInput } from '../../repositories/integration-resource.repository';
import {
  IntegrationResourceSyncHandler,
  ResourceSyncContext,
  ResourceSyncResult,
} from './resource-sync.types';

const PAGE_SIZE = 100;

interface PinterestBoard {
  id: string;
  name?: string;
  description?: string;
  privacy?: string;
  media?: { image_cover_url?: string };
}

interface PinterestBoardsResponse {
  items?: PinterestBoard[];
  bookmark?: string | null;
  message?: string;
}

@Injectable()
export class PinterestResourceSyncHandler
  implements IntegrationResourceSyncHandler
{
  readonly providerKey = 'pinterest';

  constructor(private readonly pinterestTokenService: PinterestTokenService) {}

  async sync(context: ResourceSyncContext): Promise<ResourceSyncResult> {
    const accessToken = await this.pinterestTokenService.getAccessToken(
      context.businessId,
    );

    const boards: PinterestBoard[] = [];
    let bookmark: string | undefined;

    do {
      const url = new URL(getPinterestBoardsUrl());
      url.searchParams.set('page_size', String(PAGE_SIZE));
      if (bookmark) url.searchParams.set('bookmark', bookmark);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Failed to fetch Pinterest boards (${response.status}): ${detail}`,
        );
      }

      const data = (await response.json()) as PinterestBoardsResponse;
      boards.push(...(data.items ?? []));
      bookmark = data.bookmark?.trim() || undefined;
    } while (bookmark);

    const now = new Date();
    // Omit isSelected/isDefault so re-sync preserves user board picks.
    const items: UpsertIntegrationResourceInput[] = boards.map((board) => ({
      externalId: board.id,
      name: board.name ?? board.id,
      type: IntegrationResourceType.PINTEREST_BOARD,
      metadata: {
        description: board.description ?? null,
        privacy: board.privacy ?? null,
        imageUrl: board.media?.image_cover_url ?? null,
      },
      lastSyncedAt: now,
    }));

    return { items, synced: true };
  }
}
