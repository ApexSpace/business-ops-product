import { Injectable, Logger } from '@nestjs/common';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';
import { runAsyncJob } from '@app/core/queue/processors/async-job-processor.util';
import type { DataImportJobPayload } from '@app/core/queue/queue.types';
import { DataImportService } from '../../services/data-import.service';

@Injectable()
export class ProcessDataImportProcessor {
  private readonly logger = new Logger(ProcessDataImportProcessor.name);

  constructor(
    private readonly asyncJobRepository: AsyncJobRepository,
    private readonly dataImportService: DataImportService,
  ) {}

  async process(payload: DataImportJobPayload): Promise<void> {
    await runAsyncJob(
      {
        logger: this.logger,
        asyncJobRepository: this.asyncJobRepository,
      },
      payload,
      () =>
        this.dataImportService.processImportJob({
          businessId: payload.businessId,
          dataImportJobId: payload.dataImportJobId,
          actorUserId: payload.actorUserId,
        }),
    );
  }
}
