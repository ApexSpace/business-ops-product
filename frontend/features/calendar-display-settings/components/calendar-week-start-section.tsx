"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  formatWeekStartLabel,
  updateWeekStart,
  WEEK_START_OPTIONS,
  type WeekStartsOn,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { useCalendarDisplaySettingsMutation } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings-mutation";

export function CalendarWeekStartSection() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data } = useCalendarDisplaySettings();
  const mutation = useCalendarDisplaySettingsMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<WeekStartsOn>("SUNDAY");
  const [saved, setSaved] = useState<WeekStartsOn>("SUNDAY");

  useEffect(() => {
    if (data) {
      setDraft(data.weekStartsOn);
      setSaved(data.weekStartsOn);
    }
  }, [data]);

  return (
    <SettingsInlineEditSection
      title="Start of the Week"
      description="This setting affects reports and the week view on mobile. Desktop week view always starts with the current day."
      summary={
        <SettingsViewRows
          rows={[
            {
              label: "Week starts on",
              value: formatWeekStartLabel(saved),
            },
          ]}
        />
      }
      isEditing={isEditing}
      onEdit={() => {
        setDraft(saved);
        setIsEditing(true);
      }}
      onDiscard={() => {
        setDraft(saved);
        setIsEditing(false);
      }}
      onSave={() =>
        mutation.mutate(() => updateWeekStart({ weekStartsOn: draft }), {
          onSuccess: () => {
            setSaved(draft);
            setIsEditing(false);
          },
        })
      }
      isDirty={draft !== saved}
      isSaving={mutation.isPending}
      disabled={!canEdit}
    >
      <div className="grid grid-cols-2 gap-2">
        {WEEK_START_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={draft === option.value ? "brand" : "outline"}
            onClick={() => setDraft(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </SettingsInlineEditSection>
  );
}
