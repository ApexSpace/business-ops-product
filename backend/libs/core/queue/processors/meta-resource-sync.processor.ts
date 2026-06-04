import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import type { MetaResourceSyncJobPayload } from '../queue.types';
import { MetaResourceSyncService } from '@app/modules/integrations/integrations/meta/services/meta-resource-sync.service';
import { runAsyncJob } from './async-job-processor.util';

@Injectable()
export class MetaResourceSyncProcessor {
  private readonly logger = new Logger(MetaResourceSyncProcessor.name);

  constructor(
    private readonly metaResourceSyncService: MetaResourceSyncService,
    private readonly asyncJobRepository: AsyncJobRepository,
  ) {}

  async process(payload: MetaResourceSyncJobPayload): Promise<void> {
    await runAsyncJob(
      { logger: this.logger, asyncJobRepository: this.asyncJobRepository },
      payload,
      async () => {
        const resourceCount =
          await this.metaResourceSyncService.syncAfterConnect(
            payload.businessId,
            payload.providerKey,
          );
        return { resourceCount };
      },
    );
  }
}
