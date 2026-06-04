import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';

@Injectable()
export class JobsService {
  constructor(private readonly asyncJobRepository: AsyncJobRepository) {}

  async getJob(businessId: string, jobId: string) {
    const job = await this.asyncJobRepository.findById(businessId, jobId);
    if (!job) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      entityType: job.entityType,
      entityId: job.entityId,
      errorMessage: job.errorMessage,
      result: job.result,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
