import { Injectable, Logger } from '@nestjs/common';
import { SocialCommentRepository } from '../repositories/social-comment.repository';
import { SocialEngagementAdapterRegistry } from '../engagement/social-engagement.registry';
import { SocialCommentsService } from './social-comments.service';

/**
 * Periodic backstop for missed/delayed webhooks (and YouTube, which has no
 * comment push). Staggers by taking a limited batch of published targets.
 */
@Injectable()
export class SocialEngagementReconcileService {
  private readonly logger = new Logger(SocialEngagementReconcileService.name);

  constructor(
    private readonly commentRepository: SocialCommentRepository,
    private readonly engagementRegistry: SocialEngagementAdapterRegistry,
    private readonly commentsService: SocialCommentsService,
  ) {}

  async reconcileDueTargets(take = 40): Promise<number> {
    const providerKeys = this.engagementRegistry.listProviderKeys();
    const targets =
      await this.commentRepository.findPublishedTargetsForEngagement({
        providerKeys,
        take,
      });

    let upserted = 0;
    for (const target of targets) {
      try {
        upserted += await this.commentsService.reconcileTarget(target);
        // Small delay to reduce Meta rate-limit pressure across tenants.
        await sleep(150);
      } catch (error) {
        this.logger.warn(
          `Engagement reconcile skipped target=${target.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Engagement reconcile finished targets=${targets.length} upserted≈${upserted}`,
    );
    return upserted;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
