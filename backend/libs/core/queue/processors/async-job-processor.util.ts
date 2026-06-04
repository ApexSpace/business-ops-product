import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AsyncJobRepository } from '@app/core/jobs/async-job.repository';

export async function runAsyncJob<T extends { asyncJobId: string }>(
  deps: {
    logger: Logger;
    asyncJobRepository: AsyncJobRepository;
  },
  payload: T,
  handler: () => Promise<Record<string, unknown> | void>,
): Promise<void> {
  const { asyncJobId } = payload;
  await deps.asyncJobRepository.markActive(asyncJobId);

  try {
    const result = await handler();
    await deps.asyncJobRepository.markCompleted(
      asyncJobId,
      result as Prisma.InputJsonValue | undefined,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.logger.error(
      `AsyncJob ${asyncJobId} failed: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
    await deps.asyncJobRepository.markFailed(asyncJobId, message);
    throw error;
  }
}
