import { Injectable, Logger } from '@nestjs/common';
import type { SocialPublishJobPayload } from '@app/core/queue/queue.types';
import { SocialPublishService } from '../../services/social-publish.service';

@Injectable()
export class SocialPublishProcessor {
  private readonly logger = new Logger(SocialPublishProcessor.name);

  constructor(private readonly socialPublishService: SocialPublishService) {}

  async process(payload: SocialPublishJobPayload): Promise<void> {
    try {
      await this.socialPublishService.publishTarget(
        payload.businessId,
        payload.socialPostTargetId,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Social publish job failed';
      this.logger.error(
        `Social publish job failed for target ${payload.socialPostTargetId}: ${message}`,
      );
      throw error;
    }
  }
}
