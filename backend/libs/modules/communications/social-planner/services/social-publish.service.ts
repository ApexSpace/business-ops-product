import { Injectable, Logger } from '@nestjs/common';
import { SocialPostTargetStatus } from '@prisma/client';
import { StorageService } from '@app/modules/storage/services/storage.service';
import { FileAssetRepository } from '@app/modules/storage/repositories/file-asset.repository';
import { SocialPublishAdapterRegistry } from '../adapters/social-publish.registry';
import type { SocialPublishInput } from '../adapters/social-publish-adapter.interface';
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
        platformPayload: (target.platformPayload as Record<string, unknown>) ?? {},
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

      await this.socialPostRepository.updateTarget(target.id, {
        status: SocialPostTargetStatus.PUBLISHED,
        externalPostId: result.externalPostId,
        permalink: result.permalink ?? null,
        publishedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      });

      // Seed SocialPostMetrics shortly after publish (analytics reads DB only).
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
      this.logger.error(
        `Failed to publish social post target ${targetId}: ${message}`,
      );

      const attemptCount = target.attemptCount + 1;
      const permanentFailure = attemptCount >= MAX_PUBLISH_ATTEMPTS;

      await this.socialPostRepository.updateTarget(target.id, {
        status: permanentFailure
          ? SocialPostTargetStatus.FAILED
          : SocialPostTargetStatus.SCHEDULED,
        errorCode: 'PUBLISH_FAILED',
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
        const { downloadUrl } = await this.storageService.getDownloadUrlForObjectKey(
          asset.objectKey,
        );
        return {
          url: downloadUrl,
          mimeType: asset.mimeType,
          fileAssetId: asset.id,
        };
      }),
    );

    return resolved.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );
  }
}
