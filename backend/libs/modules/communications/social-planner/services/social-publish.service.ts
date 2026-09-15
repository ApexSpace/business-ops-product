import { Injectable, Logger } from '@nestjs/common';
import { Prisma, SocialPostTargetStatus } from '@prisma/client';
import { StorageService } from '@app/modules/storage/services/storage.service';
import { FileAssetRepository } from '@app/modules/storage/repositories/file-asset.repository';
import { SocialPublishAdapterRegistry } from '../adapters/social-publish.registry';
import type { SocialPublishInput } from '../adapters/social-publish-adapter.interface';
import {
  TIKTOK_PUBLISH_ID_PAYLOAD_KEY,
  TikTokApiError,
} from '../adapters/tiktok/tiktok.constants';
import {
  YOUTUBE_UPLOAD_SESSION_PAYLOAD_KEY,
  YOUTUBE_VIDEO_ID_PAYLOAD_KEY,
  YouTubeApiError,
} from '../adapters/youtube/youtube.constants';
import {
  SocialPostRepository,
  SocialPostTargetWithRelations,
} from '../repositories/social-post.repository';
import { SocialMetricsSyncService } from './social-metrics-sync.service';
import { SocialTokenResolverService } from './social-token-resolver.service';

const MAX_PUBLISH_ATTEMPTS = 5;

@Injectable()
export class SocialPublishService {
  private readonly logger = new Logger(SocialPublishService.name);

  constructor(
    private readonly socialPostRepository: SocialPostRepository,
    private readonly adapterRegistry: SocialPublishAdapterRegistry,
    private readonly tokenResolver: SocialTokenResolverService,
    private readonly storageService: StorageService,
    private readonly fileAssetRepository: FileAssetRepository,
    private readonly socialMetricsSyncService: SocialMetricsSyncService,
  ) {}

  async publishTarget(businessId: string, targetId: string): Promise<void> {
    const target = await this.socialPostRepository.findTargetById(
      businessId,
      targetId,
    );
    if (!target) {
      this.logger.warn(`Social post target not found: ${targetId}`);
      return;
    }

    if (target.externalPostId) {
      this.logger.log(
        `Target ${targetId} already has externalPostId, skipping duplicate publish`,
      );
      return;
    }

    if (
      target.status === SocialPostTargetStatus.PUBLISHED ||
      target.status === SocialPostTargetStatus.CANCELLED
    ) {
      return;
    }

    await this.socialPostRepository.updateTarget(target.id, {
      status: SocialPostTargetStatus.PUBLISHING,
      attemptCount: { increment: 1 },
    });

    const platformPayload = {
      ...((target.platformPayload as Record<string, unknown> | null) ?? {}),
    };

    try {
      const adapter = this.adapterRegistry.getAdapter(target.providerKey);
      if (!adapter) {
        throw new Error(`No publish adapter registered for ${target.providerKey}`);
      }

      const media = await this.resolveMedia(businessId, target);

      const input: SocialPublishInput = {
        businessId,
        providerKey: target.providerKey,
        postType: target.postType,
        caption: target.socialPost.caption,
        platformPayload,
        media,
        accessToken: await this.tokenResolver.getAccessToken(
          businessId,
          target.providerKey,
          target.integrationResourceId,
        ),
        externalResourceId: target.resource?.externalId ?? '',
        metadata: {
          socialPostId: target.socialPostId,
          socialPostTargetId: target.id,
          onTikTokPublishInitiated: async (publishId: string) => {
            platformPayload[TIKTOK_PUBLISH_ID_PAYLOAD_KEY] = publishId;
            await this.socialPostRepository.updateTarget(target.id, {
              platformPayload: platformPayload as Prisma.InputJsonValue,
            });
            this.logger.log(
              `Persisted TikTok publish_id=${publishId} for target=${target.id}`,
            );
          },
          onYouTubePublishProgress: async (patch: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(patch)) {
              if (value === undefined) {
                delete platformPayload[key];
              } else {
                platformPayload[key] = value;
              }
            }
            await this.socialPostRepository.updateTarget(target.id, {
              platformPayload: platformPayload as Prisma.InputJsonValue,
            });
          },
        },
      };

      const validation = adapter.validate(input);
      if (!validation.valid) {
        throw new Error(
          validation.issues.map((issue) => issue.message).join('; ') ||
            'Validation failed',
        );
      }

      const result = await adapter.publish(input);

      delete platformPayload[TIKTOK_PUBLISH_ID_PAYLOAD_KEY];
      delete platformPayload[YOUTUBE_VIDEO_ID_PAYLOAD_KEY];
      delete platformPayload[YOUTUBE_UPLOAD_SESSION_PAYLOAD_KEY];

      await this.socialPostRepository.updateTarget(target.id, {
        status: SocialPostTargetStatus.PUBLISHED,
        externalPostId: result.externalPostId,
        permalink: result.permalink ?? null,
        publishedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        platformPayload: platformPayload as Prisma.InputJsonValue,
      });

      void this.socialMetricsSyncService
        .syncTargetById(businessId, target.id)
        .catch((metricsError) => {
          this.logger.warn(
            `Post-publish metrics sync skipped for ${target.id}: ${
              metricsError instanceof Error
                ? metricsError.message
                : String(metricsError)
            }`,
          );
        });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Social publish failed';
      const errorCode =
        error instanceof TikTokApiError || error instanceof YouTubeApiError
          ? (error.code ?? 'PUBLISH_FAILED').slice(0, 64)
          : 'PUBLISH_FAILED';

      this.logger.error(
        `Failed to publish social post target ${targetId}: ${message}${
          error instanceof TikTokApiError && error.logId
            ? ` log_id=${error.logId}`
            : ''
        }`,
      );

      const attemptCount = target.attemptCount + 1;
      const permanentFailure = attemptCount >= MAX_PUBLISH_ATTEMPTS;

      await this.socialPostRepository.updateTarget(target.id, {
        status: permanentFailure
          ? SocialPostTargetStatus.FAILED
          : SocialPostTargetStatus.SCHEDULED,
        errorCode,
        errorMessage: message.slice(0, 500),
      });
    } finally {
      await this.socialPostRepository.rollupParentStatus(target.socialPostId);
    }
  }

  private async resolveMedia(
    businessId: string,
    target: SocialPostTargetWithRelations,
  ): Promise<SocialPublishInput['media']> {
    const mediaEntities =
      target.media.length > 0 ? target.media : target.socialPost.media;

    const resolved = await Promise.all(
      mediaEntities.map(async (media) => {
        const asset = await this.fileAssetRepository.findById(
          businessId,
          media.fileAssetId,
        );
        if (!asset) {
          return null;
        }
        const { url, isPublic } = await this.storageService.getPublishMediaUrl(
          asset.objectKey,
          { preferPublic: true },
        );
        const metadata =
          asset.metadata && typeof asset.metadata === 'object'
            ? (asset.metadata as Record<string, unknown>)
            : {};
        const durationRaw = metadata.durationSec ?? metadata.duration;
        const durationSec =
          typeof durationRaw === 'number'
            ? durationRaw
            : typeof durationRaw === 'string'
              ? Number(durationRaw)
              : undefined;
        return {
          url,
          mimeType: asset.mimeType,
          fileAssetId: asset.id,
          objectKey: asset.objectKey,
          sizeBytes: asset.size,
          isPublicUrl: isPublic,
          durationSec:
            durationSec !== undefined && Number.isFinite(durationSec)
              ? durationSec
              : undefined,
        };
      }),
    );

    return resolved.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  }
}
