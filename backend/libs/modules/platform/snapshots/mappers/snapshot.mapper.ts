import { Snapshot } from '@prisma/client';
import {
  SnapshotListItemDto,
  SnapshotResponseDto,
} from '../dto/snapshot.dto';
import { parseSnapshotAssets } from './snapshot-assets.parser';

export function toSnapshotResponse(
  snapshot: Snapshot,
  businessCount?: number,
): SnapshotResponseDto {
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    status: snapshot.status,
    assets: parseSnapshotAssets(snapshot.assets),
    publishedAt: snapshot.publishedAt,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    ...(businessCount !== undefined ? { businessCount } : {}),
  };
}

export function toSnapshotListItem(
  snapshot: Snapshot & { _count?: { businesses: number } },
): SnapshotListItemDto {
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    status: snapshot.status,
    publishedAt: snapshot.publishedAt,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    businessCount: snapshot._count?.businesses ?? 0,
  };
}
