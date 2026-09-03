"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  formatVisibleHoursLabel,
  TIME_OPTIONS,
  updateVisibleHours,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { useCalendarDisplaySettingsMutation } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings-mutation";

export function CalendarVisibleHoursSection() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data } = useCalendarDisplaySettings();
  const mutation = useCalendarDisplaySettingsMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [draftStart, setDraftStart] = useState("00:00");
  const [draftEnd, setDraftEnd] = useState("24:00");
  const [savedStart, setSavedStart] = useState("00:00");
  const [savedEnd, setSavedEnd] = useState("24:00");

  useEffect(() => {
    if (data) {
      setDraftStart(data.visibleStartTime);
      setDraftEnd(data.visibleEndTime);
      setSavedStart(data.visibleStartTime);
      setSavedEnd(data.visibleEndTime);
    }
  }, [data]);

  const isDirty = draftStart !== savedStart || draftEnd !== savedEnd;

  return (
    <SettingsInlineEditSection
      title="Visible hours"
      description="Set the time range shown in day and week calendar views."
      summary={
        <SettingsViewRows
          rows={[
            {
              label: "Visible hours",
              value: formatVisibleHoursLabel(savedStart, savedEnd),
            },
          ]}
        />
      }
      isEditing={isEditing}
      onEdit={() => {
        setDraftStart(savedStart);
        setDraftEnd(savedEnd);
        setIsEditing(true);
      }}
      onDiscard={() => {
        setDraftStart(savedStart);
        setDraftEnd(savedEnd);
        setIsEditing(false);
      }}
      onSave={() =>
        mutation.mutate(
          () =>
            updateVisibleHours({
              visibleStartTime: draftStart,
              visibleEndTime: draftEnd,
            }),
          {
            onSuccess: () => {
              setSavedStart(draftStart);
              setSavedEnd(draftEnd);
              setIsEditing(false);
            },
          },
        )
      }
      isDirty={isDirty}
      isSaving={mutation.isPending}
      disabled={!canEdit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start time</Label>
          <div className="grid max-h-48 gap-1 overflow-y-auto">
            {TIME_OPTIONS.filter((option) => option.value !== "24:00").map(
              (option) => (
                <Button
                  key={`start-${option.value}`}
                  type="button"
                  variant={draftStart === option.value ? "brand" : "outline"}
                  size="sm"
                  onClick={() => setDraftStart(option.value)}
                >
                  {option.label}
                </Button>
              ),
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>End time</Label>
          <div className="grid max-h-48 gap-1 overflow-y-auto">
            {TIME_OPTIONS.filter((option) => option.value !== "00:00").map(
              (option) => (
                <Button
                  key={`end-${option.value}`}
                  type="button"
                  variant={draftEnd === option.value ? "brand" : "outline"}
                  size="sm"
                  onClick={() => setDraftEnd(option.value)}
                >
                  {option.label}
                </Button>
              ),
            )}
          </div>
        </div>
      </div>
    </SettingsInlineEditSection>
  );
}
