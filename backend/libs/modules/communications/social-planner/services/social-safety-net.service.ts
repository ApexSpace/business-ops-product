import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@app/core/queue/queue.service';
import { SocialPostRepository } from '../repositories/social-post.repository';
import { socialPublishSafetyJobId } from '../utils/social-publish-job-id.util';

/** Grace window so near-due delayed jobs are not double-enqueued too early. */
const SAFETY_NET_GRACE_MS = 60_000;

@Injectable()
export class SocialSafetyNetService {
  private readonly logger = new Logger(SocialSafetyNetService.name);

  constructor(
    private readonly socialPostRepository: SocialPostRepository,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Re-enqueues stranded SCHEDULED targets that are due and have no externalPostId.
   * Uses versioned BullMQ job ids so completed original jobs cannot block re-add.
   */
  async catchStrandedTargets(): Promise<number> {
    const cutoff = new Date(Date.now() - SAFETY_NET_GRACE_MS);
    const stranded =
      await this.socialPostRepository.findDueScheduledTargets(cutoff);

    let enqueued = 0;
    for (const target of stranded) {
      const jobId = socialPublishSafetyJobId(target.id);
      const result = await this.queueService.enqueueSocialPublish(
        {
          businessId: target.socialPost.businessId,
          socialPostTargetId: target.id,
        },
        { delay: 0, jobId },
      );
      if (result) {
        enqueued += 1;
        this.logger.warn(
          `Safety-net catch for target ${target.id} (jobId=${jobId})`,
        );
      }
    }

    if (enqueued > 0) {
      this.logger.log(`Social publish safety-net enqueued ${enqueued} target(s)`);
    }
    return enqueued;
  }
}
