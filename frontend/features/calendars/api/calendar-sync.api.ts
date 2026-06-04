import { api } from "@/lib/api/client";
import { getJobIdFromMeta, pollAsyncJob } from "@/lib/api/async-job";
import type { GoogleCalendarSyncSummary } from "@/features/calendars/utils/google-calendar-sync";

export async function triggerGoogleCalendarSync(calendarId: string) {
  const { data, meta } = await api.postWithMeta<{ jobId: string; status: string }>(
    `calendars/${calendarId}/sync/google`,
  );

  const jobId = getJobIdFromMeta(meta) ?? data?.jobId;
  if (!jobId) {
    throw new Error("Sync started but no job id returned");
  }

  const job = await pollAsyncJob(jobId);
  return (job.result ?? {}) as GoogleCalendarSyncSummary;
}
