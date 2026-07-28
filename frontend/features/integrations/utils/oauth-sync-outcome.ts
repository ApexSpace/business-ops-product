import { pollAsyncJob } from "@/lib/api/async-job";
import {
  listIntegrationResources,
  type IntegrationsHostMode,
} from "@/features/integrations/api/integrations.api";
import { getIntegrationManageCopy } from "@/features/integrations/utils/integration-manage-copy";

export async function waitForOAuthResourceSync(options: {
  providerKey: string;
  jobId?: string;
  host?: IntegrationsHostMode;
}): Promise<{ resourceCount: number }> {
  const host = options.host ?? "business";

  if (options.jobId) {
    try {
      const job = await pollAsyncJob(options.jobId, {
        intervalMs: 1500,
        maxAttempts: 60,
      });
      const result = job.result as { resourceCount?: number } | null;
      if (typeof result?.resourceCount === "number") {
        return { resourceCount: result.resourceCount };
      }
    } catch {
      // Fall through to resources list — job may have finished without readable result.
    }
  }

  const list = await listIntegrationResources(options.providerKey, host);
  return { resourceCount: list.resources.length };
}

export function oauthSyncOutcomeToastMessage(
  providerKey: string,
  resourceCount: number,
): { type: "success" | "warning"; message: string } {
  const copy = getIntegrationManageCopy(providerKey);
  const label =
    providerKey === "facebook"
      ? "Facebook"
      : providerKey === "instagram"
        ? "Instagram"
        : providerKey === "google-business-profile"
          ? "Google Business Profile"
          : providerKey === "google-calendar"
            ? "Google Calendar"
            : providerKey;

  if (resourceCount > 0) {
    return {
      type: "success",
      message: `${label} connected — ${copy.syncSuccessToast(resourceCount)}`,
    };
  }

  return {
    type: "warning",
    message: `${label} connected, but ${copy.syncEmptyToast.toLowerCase()}. Open Manage to reconnect or sync again.`,
  };
}

export function oauthConnectingToastMessage(providerKey: string): string {
  if (providerKey === "google-business-profile") {
    return "Google Business Profile connected — syncing locations…";
  }
  if (providerKey === "google-calendar") {
    return "Google Calendar connected — syncing calendars…";
  }
  if (providerKey === "facebook") {
    return "Facebook connected — syncing pages…";
  }
  if (providerKey === "instagram") {
    return "Instagram connected — syncing accounts…";
  }
  return "Connected — syncing resources…";
}
