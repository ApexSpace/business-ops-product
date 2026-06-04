import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import type { IntegrationResourceSyncJobPayload } from '../queue.types';
import { IntegrationResourcesService } from '@app/modules/integrations/integrations/services/integration-resources.service';
import { runAsyncJob } from './async-job-processor.util';

@Injectable()
export class IntegrationResourceSyncProcessor {
  private readonly logger = new Logger(IntegrationResourceSyncProcessor.name);

  constructor(
    private readonly integrationResourcesService: IntegrationResourcesService,
    private readonly asyncJobRepository: AsyncJobRepository,
  ) {}

  async process(payload: IntegrationResourceSyncJobPayload): Promise<void> {
    await runAsyncJob(
      { logger: this.logger, asyncJobRepository: this.asyncJobRepository },
      payload,
      async () => {
        const result =
          await this.integrationResourcesService.executeSyncResources(
            payload.businessId,
            payload.providerKey,
            payload.actorUserId,
          );
        return {
          synced: result.synced,
          resourceCount: result.resources.length,
        };
      },
    );
  }
}
