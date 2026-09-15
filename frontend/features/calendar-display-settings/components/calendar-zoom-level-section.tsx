"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  formatZoomLevelLabel,
  updateZoomLevel,
  ZOOM_LEVEL_OPTIONS,
  type CalendarZoomLevel,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { useCalendarDisplaySettingsMutation } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings-mutation";

export function CalendarZoomLevelSection() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data } = useCalendarDisplaySettings();
  const mutation = useCalendarDisplaySettingsMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CalendarZoomLevel>("MEDIUM");
  const [saved, setSaved] = useState<CalendarZoomLevel>("MEDIUM");

  useEffect(() => {
    if (data) {
      setDraft(data.zoomLevel);
      setSaved(data.zoomLevel);
    }
  }, [data]);

  return (
    <SettingsInlineEditSection
      title="Zoom Level"
      description="If you offer services under 30 minutes, select a larger zoom level so appointment information is visible on the calendar."
      summary={
        <SettingsViewRows
          rows={[
            { label: "Zoom level", value: formatZoomLevelLabel(saved) },
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
        mutation.mutate(() => updateZoomLevel({ zoomLevel: draft }), {
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
      <div className="grid grid-cols-3 gap-2">
        {ZOOM_LEVEL_OPTIONS.map((option) => (
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
