import { api } from "./client";

export type AsyncJobStatus =
  | "QUEUED"
  | "ACTIVE"
  | "COMPLETED"
  | "FAILED";

export interface AsyncJobAcceptedMeta {
  jobId: string;
  pollUrl: string;
  sseChannel: string;
  status: string;
}

export interface AsyncJobRecord {
  id: string;
  type: string;
  status: AsyncJobStatus;
  entityType: string | null;
  entityId: string | null;
  errorMessage: string | null;
  result: unknown;
  createdAt: string;
  completedAt: string | null;
}

export function isAsyncJobAccepted(
  body: unknown,
): body is { data: { jobId: string }; meta: AsyncJobAcceptedMeta } {
  if (typeof body !== "object" || body === null) return false;
  const record = body as Record<string, unknown>;
  const meta = record.meta;
  return (
    typeof meta === "object" &&
    meta !== null &&
    typeof (meta as AsyncJobAcceptedMeta).jobId === "string"
  );
}

export function getJobIdFromMeta(
  meta: AsyncJobAcceptedMeta | Record<string, unknown> | undefined,
): string | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const jobId = (meta as AsyncJobAcceptedMeta).jobId;
  return typeof jobId === "string" ? jobId : undefined;
}

export function getAsyncJob(jobId: string) {
  return api.get<AsyncJobRecord>(`jobs/${jobId}`);
}

export async function pollAsyncJob(
  jobId: string,
  options?: { intervalMs?: number; maxAttempts?: number },
): Promise<AsyncJobRecord> {
  const intervalMs = options?.intervalMs ?? 1500;
  const maxAttempts = options?.maxAttempts ?? 120;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const job = await getAsyncJob(jobId);
    if (job.status === "COMPLETED") {
      return job;
    }
    if (job.status === "FAILED") {
      throw new Error(job.errorMessage ?? "Background job failed");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Job timed out");
}
