"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  formatCancelledVisibilityLabel,
  updateCancelledVisibility,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { useCalendarDisplaySettings } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings";
import { useCalendarDisplaySettingsMutation } from "@/features/calendar-display-settings/hooks/use-calendar-display-settings-mutation";
import { cn } from "@/lib/utils";

type CancelledDraft = {
  showNormalCancellation: boolean;
  showLateCancellation: boolean;
  showNoShow: boolean;
};

const DEFAULT_CANCELLED: CancelledDraft = {
  showNormalCancellation: true,
  showLateCancellation: true,
  showNoShow: true,
};

export function CalendarCancelledVisibilitySection() {
  const canEdit = useCan(PERMISSIONS["settings.business"]);
  const { data } = useCalendarDisplaySettings();
  const mutation = useCalendarDisplaySettingsMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<CancelledDraft>(DEFAULT_CANCELLED);
  const [saved, setSaved] = useState<CancelledDraft>(DEFAULT_CANCELLED);

  useEffect(() => {
    if (data) {
      const next = {
        showNormalCancellation: data.showNormalCancellation,
        showLateCancellation: data.showLateCancellation,
        showNoShow: data.showNoShow,
      };
      setDraft(next);
      setSaved(next);
    }
  }, [data]);

  const labels = formatCancelledVisibilityLabel(saved);

  return (
    <SettingsInlineEditSection
      title="Visibility of Canceled Appointments"
      description="Choose which types of cancellations remain visible on the calendar."
      summary={
        <SettingsViewRows
          rows={[{ label: "Visible on calendar", value: labels }]}
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
        mutation.mutate(() => updateCancelledVisibility(draft), {
          onSuccess: () => {
            setSaved(draft);
            setIsEditing(false);
          },
        })
      }
      isDirty={JSON.stringify(draft) !== JSON.stringify(saved)}
      isSaving={mutation.isPending}
      disabled={!canEdit}
    >
      <div className="space-y-3">
        {[
          {
            key: "showNormalCancellation" as const,
            label: "Normal cancellation",
          },
          { key: "showLateCancellation" as const, label: "Late cancellation" },
          { key: "showNoShow" as const, label: "No show" },
        ].map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-2",
              draft[item.key] && "border-primary bg-primary/5",
            )}
          >
            <Label htmlFor={`cancelled-${item.key}`}>{item.label}</Label>
            <Switch
              id={`cancelled-${item.key}`}
              checked={draft[item.key]}
              onCheckedChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  [item.key]: checked,
                }))
              }
            />
          </div>
        ))}
      </div>
    </SettingsInlineEditSection>
  );
}
