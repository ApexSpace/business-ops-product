import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import type { GenerateReportJobPayload } from '@app/core/queue/queue.types';
import { runAsyncJob } from '@app/core/queue/processors/async-job-processor.util';

/**
 * Legacy queue handler. Report exports now stream directly from the API
 * and are no longer persisted to object storage.
 */
@Injectable()
export class GenerateReportProcessor {
  private readonly logger = new Logger(GenerateReportProcessor.name);

  constructor(private readonly asyncJobRepository: AsyncJobRepository) {}

  async process(payload: GenerateReportJobPayload): Promise<void> {
    await runAsyncJob(
      {
        logger: this.logger,
        asyncJobRepository: this.asyncJobRepository,
      },
      payload,
      async () => {
        throw new Error(
          'Async report export has been removed. Download the report again from the Reports page.',
        );
      },
    );
  }
}
