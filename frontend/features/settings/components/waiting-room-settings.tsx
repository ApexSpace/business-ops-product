"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormPage } from "@/components/layout/settings-page-layout";
import { SettingsToggleSection } from "@/components/layout/settings-toggle-section";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  updateWaitingRoomSettings,
  type WaitingRoomSettings,
} from "@/features/waiting-room-settings/api/waiting-room-settings.api";
import { useWaitingRoomSettings } from "@/features/waiting-room-settings/hooks/use-waiting-room-settings";
import { invalidateWaitingRoomSettings } from "@/lib/query/invalidation";
import { SETTINGS_FORM_SECTION_STACK_CLASS } from "@/lib/design/settings-form-tokens";

function useSectionState(source: WaitingRoomSettings | undefined) {
  const [draft, setDraft] = useState<{ waitingStatusEnabled: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (source) {
      setDraft({ waitingStatusEnabled: source.waitingStatusEnabled });
    }
  }, [source]);

  const saved = source
    ? { waitingStatusEnabled: source.waitingStatusEnabled }
    : null;
  const values = draft ?? saved;
  const isDirty =
    saved != null &&
    values != null &&
    JSON.stringify(values) !== JSON.stringify(saved);

  const reset = useCallback(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  const commit = useCallback((next: { waitingStatusEnabled: boolean }) => {
    setDraft(next);
  }, []);

  return { values, isDirty, reset, commit };
}

export function WaitingRoomSettings() {
  const queryClient = useQueryClient();
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data, isLoading, isError, error } = useWaitingRoomSettings();
  const section = useSectionState(data);

  const mutation = useMutation({
    mutationFn: updateWaitingRoomSettings,
    onSuccess: async () => {
      await invalidateWaitingRoomSettings(queryClient);
      toast.success("Waiting room settings saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <LoadingState label="Loading waiting room settings…" />;
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "Could not load waiting room settings"}
      </p>
    );
  }

  return (
    <SettingsFormPage
      title="Waiting Room"
      description="Manage the waiting status and client check-in notifications."
    >
      <div className={SETTINGS_FORM_SECTION_STACK_CLASS}>
        <SettingsToggleSection
          id="waiting-status-enabled"
          title='Enable "Waiting" Status'
          description={
            <>
              Enable a &quot;waiting&quot; status on the calendar to keep track of
              clients who have arrived and are waiting for their appointment. When
              the service provider is ready, staff members can send a text message
              to notify the client.
              <span className="mt-2 block">
                Optionally, the system can also send automated messages 15 minutes
                before the appointment to let clients check-in themselves.
              </span>
              <span className="mt-2 block">
                To configure check-in related messages go to:{" "}
                <Link
                  href="/business/settings/notifications?tab=templates&type=appointment.ready"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Check-In Process
                </Link>
              </span>
            </>
          }
          checked={section.values?.waitingStatusEnabled ?? true}
          onCheckedChange={(checked) =>
            section.commit({ waitingStatusEnabled: checked })
          }
          onDiscard={section.reset}
          onSave={() =>
            mutation.mutate({
              waitingStatusEnabled: section.values?.waitingStatusEnabled,
            })
          }
          isDirty={section.isDirty}
          isSaving={mutation.isPending}
          disabled={!canEdit}
        />
      </div>
    </SettingsFormPage>
  );
}
