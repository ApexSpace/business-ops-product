import type { AsyncJob } from '@prisma/client';

export interface AsyncJobAcceptedMeta {
  jobId: string;
  pollUrl: string;
  sseChannel: string;
  status: string;
}

export function buildAsyncJobAcceptedResponse<T>(
  data: T,
  asyncJob: AsyncJob,
  businessId: string,
  apiPrefix = process.env.API_PREFIX ?? 'api/v1',
): { data: T; meta: AsyncJobAcceptedMeta } {
  return {
    data,
    meta: {
      jobId: asyncJob.id,
      status: asyncJob.status,
      pollUrl: `/${apiPrefix}/jobs/${asyncJob.id}`,
      sseChannel: `business:${businessId}`,
    },
  };
}

export function buildJobOnlyAcceptedResponse(
  asyncJob: AsyncJob,
  businessId: string,
  apiPrefix = process.env.API_PREFIX ?? 'api/v1',
): { data: { jobId: string; status: string }; meta: AsyncJobAcceptedMeta } {
  return buildAsyncJobAcceptedResponse(
    { jobId: asyncJob.id, status: asyncJob.status },
    asyncJob,
    businessId,
    apiPrefix,
  );
}
