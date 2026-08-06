import { Injectable, Logger } from '@nestjs/common';
import { SocialCommentRepository } from '../repositories/social-comment.repository';
import { SocialEngagementAdapterRegistry } from '../engagement/social-engagement.registry';
import { SocialTokenResolverService } from './social-token-resolver.service';

/**
 * Syncs aggregate engagement counts into SocialPostMetrics (~daily).
 * Analytics UIs should read from DB only — never call provider APIs at render.
 */
@Injectable()
export class SocialMetricsSyncService {
  private readonly logger = new Logger(SocialMetricsSyncService.name);

  constructor(
    private readonly commentRepository: SocialCommentRepository,
    private readonly engagementRegistry: SocialEngagementAdapterRegistry,
    private readonly tokenResolver: SocialTokenResolverService,
  ) {}

  async syncDueTargets(take = 50): Promise<number> {
    const providerKeys = this.engagementRegistry
      .listProviderKeys()
      .filter((key) => {
        const adapter = this.engagementRegistry.getAdapter(key);
        return adapter?.capabilities.syncPostMetrics;
      });

    const targets =
      await this.commentRepository.findPublishedTargetsForEngagement({
        providerKeys,
        take,
      });

    let synced = 0;
    for (const target of targets) {
      if (!target.externalPostId) continue;
      const adapter = this.engagementRegistry.getAdapter(target.providerKey);
      if (!adapter?.capabilities.syncPostMetrics) continue;

      try {
        const accessToken = await this.tokenResolver.getAccessToken(
          target.socialPost.businessId,
          target.providerKey,
          target.integrationResourceId,
        );
        const snapshot = await adapter.syncPostMetrics({
          externalPostId: target.externalPostId,
          accessToken,
          externalResourceId: target.resource?.externalId,
        });
        await this.commentRepository.upsertMetrics(target.id, {
          likes: snapshot.likes,
          comments: snapshot.comments,
          shares: snapshot.shares,
          reach: snapshot.reach,
          impressions: snapshot.impressions,
          views: snapshot.views,
          rawJson: snapshot.raw as object | undefined,
        });
        synced += 1;
        await sleep(150);
      } catch (error) {
        this.logger.warn(
          `Metrics sync skipped target=${target.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Social metrics sync finished targets=${targets.length} synced=${synced}`,
    );
    return synced;
  }

  async syncTargetById(
    businessId: string,
    socialPostTargetId: string,
  ): Promise<void> {
    const target = await this.commentRepository.findTargetById(
      businessId,
      socialPostTargetId,
    );
    if (!target?.externalPostId) return;
    const adapter = this.engagementRegistry.getAdapter(target.providerKey);
    if (!adapter?.capabilities.syncPostMetrics) return;

    const accessToken = await this.tokenResolver.getAccessToken(
      businessId,
      target.providerKey,
      target.integrationResourceId,
    );
    const snapshot = await adapter.syncPostMetrics({
      externalPostId: target.externalPostId,
      accessToken,
      externalResourceId: target.resource?.externalId,
    });
    await this.commentRepository.upsertMetrics(target.id, {
      likes: snapshot.likes,
      comments: snapshot.comments,
      shares: snapshot.shares,
      reach: snapshot.reach,
      impressions: snapshot.impressions,
      views: snapshot.views,
      rawJson: snapshot.raw as object | undefined,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
