"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { triggerGoogleCalendarSync } from "@/features/calendars/api/calendar-sync.api";
import type { CalendarFormValues } from "@/features/calendars/schemas/calendar-profile";
import {
  formatGoogleSyncSummary,
  type GoogleCalendarSyncStatus,
} from "@/features/calendars/utils/google-calendar-sync";
import type { IntegrationResourcesListResponse } from "@/features/integrations/utils/integration-resources";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";
import { getGoogleCalendarSyncStatus } from "@/features/calendars/api/calendars.api";

interface CalendarGoogleSyncPanelProps {
  calendarId: string;
  form: UseFormReturn<CalendarFormValues>;
  googleResources?: IntegrationResourcesListResponse;
}

export function CalendarGoogleSyncPanel({
  calendarId,
  form,
  googleResources,
}: CalendarGoogleSyncPanelProps) {
  const queryClient = useQueryClient();
  const enabled = form.watch("googleSyncEnabled");
  const direction = form.watch("googleSyncDirection");
  const resourceId = form.watch("googleIntegrationResourceId");

  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: queryKeys.calendars.googleSyncStatus(calendarId),
    queryFn: () =>
      getGoogleCalendarSyncStatus(calendarId),
    enabled: Boolean(calendarId),
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerGoogleCalendarSync(calendarId),
    onSuccess: async (summary) => {
      toast.success(formatGoogleSyncSummary(summary));
      if (summary.errors.length > 0) {
        toast.error(summary.errors[0] ?? "Some items failed to sync");
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calendars.googleSyncStatus(calendarId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedResource = googleResources?.resources.find(
    (r) => r.id === resourceId,
  );
  const showResourceWarning = enabled && direction !== "NONE" && !resourceId;

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Sync status</p>
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : syncStatus ? (
            <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div>
                <dt className="inline font-medium text-foreground">Account: </dt>
                <dd className="inline">
                  {syncStatus.connectedAccountEmail ?? "Not connected"}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">Status: </dt>
                <dd
                  className={cn(
                    "inline",
                    syncStatus.syncStatus === "ERROR" && "text-destructive",
                    syncStatus.syncStatus === "ACTIVE" && "text-emerald-600",
                  )}
                >
                  {syncStatus.syncStatus ?? "—"}
                </dd>
              </div>
              {syncStatus.lastSyncedAt ? (
                <div>
                  <dt className="inline font-medium text-foreground">Last synced: </dt>
                  <dd className="inline">
                    {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                  </dd>
                </div>
              ) : null}
              {syncStatus.lastError ? (
                <div className="text-destructive">
                  <dt className="inline font-medium">Last error: </dt>
                  <dd className="inline">{syncStatus.lastError}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              !syncStatus?.canSync ||
              syncMutation.isPending ||
              direction === "NONE" ||
              !enabled
            }
            onClick={() => syncMutation.mutate()}
          >
            <RefreshCw
              className={cn("mr-2 size-4", syncMutation.isPending && "animate-spin")}
            />
            Sync now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/business/settings/integrations" />}
          >
            Manage integration
          </Button>
        </div>
      </div>

      {selectedResource ? (
        <p className="text-sm text-muted-foreground">
          Selected Google calendar:{" "}
          <span className="font-medium text-foreground">{selectedResource.name}</span>
        </p>
      ) : null}

      {showResourceWarning ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Select a Google Calendar resource before enabling sync. Connect Google in{" "}
          <Link
            href="/business/settings/integrations"
            className="font-medium underline underline-offset-2"
          >
            Settings → Integrations
          </Link>
          , sync calendars, then choose one above.
        </p>
      ) : null}
    </div>
  );
}
