"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarZoomLevel>("MEDIUM");
  const [saved, setSaved] = useState<CalendarZoomLevel>("MEDIUM");
  const [dialogValue, setDialogValue] = useState<CalendarZoomLevel>("MEDIUM");

  useEffect(() => {
    if (data) {
      setDraft(data.zoomLevel);
      setSaved(data.zoomLevel);
    }
  }, [data]);

  return (
    <>
      <SettingsValueSection
        title="Zoom Level"
        description="If you offer services under 30 minutes, select a larger zoom level so appointment information is visible on the calendar."
        valueLabel={formatZoomLevelLabel(draft)}
        onEdit={() => {
          setDialogValue(draft);
          setDialogOpen(true);
        }}
        onDiscard={() => setDraft(saved)}
        onSave={() =>
          mutation.mutate(() => updateZoomLevel({ zoomLevel: draft }), {
            onSuccess: () => setSaved(draft),
          })
        }
        isDirty={draft !== saved}
        isSaving={mutation.isPending}
        disabled={!canEdit}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zoom Level</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {ZOOM_LEVEL_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={dialogValue === option.value ? "brand" : "outline"}
                onClick={() => setDialogValue(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                setDraft(dialogValue);
                setDialogOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
