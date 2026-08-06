import {
  SocialPostMediaResponseDto,
  SocialPostResponseDto,
  SocialPostTargetResponseDto,
} from '../dto/social-post-response.dto';
import type { SocialPostWithRelations } from '../repositories/social-post.repository';

type MediaEntity = SocialPostWithRelations['media'][number];
type TargetEntity = SocialPostWithRelations['targets'][number];

function toMediaDto(media: MediaEntity): SocialPostMediaResponseDto {
  return {
    id: media.id,
    fileAssetId: media.fileAssetId,
    thumbnailFileAssetId: media.thumbnailFileAssetId,
    sortOrder: media.sortOrder,
    altText: media.altText,
    fileName: media.fileAsset?.filename ?? null,
    mimeType: media.fileAsset?.mimeType ?? null,
  };
}

function toTargetDto(target: TargetEntity): SocialPostTargetResponseDto {
  return {
    id: target.id,
    providerKey: target.providerKey,
    integrationResourceId: target.integrationResourceId,
    resourceName: target.resource?.name ?? null,
    postType: target.postType,
    platformPayload: (target.platformPayload as Record<string, unknown>) ?? {},
    status: target.status,
    scheduledAt: target.scheduledAt,
    externalPostId: target.externalPostId,
    permalink: target.permalink,
    errorCode: target.errorCode,
    errorMessage: target.errorMessage,
    attemptCount: target.attemptCount,
    publishedAt: target.publishedAt,
    media: target.media.map(toMediaDto),
  };
}

export function toSocialPostResponseDto(
  entity: SocialPostWithRelations,
): SocialPostResponseDto {
  return {
    id: entity.id,
    businessId: entity.businessId,
    createdByUserId: entity.createdByUserId,
    status: entity.status,
    caption: entity.caption,
    scheduledAt: entity.scheduledAt,
    timezone: entity.timezone,
    publishedAt: entity.publishedAt,
    category: entity.category,
    tags: entity.tags,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    media: entity.media.map(toMediaDto),
    targets: entity.targets.map(toTargetDto),
  };
}
