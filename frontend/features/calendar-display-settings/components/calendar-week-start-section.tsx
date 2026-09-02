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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<WeekStartsOn>("SUNDAY");
  const [saved, setSaved] = useState<WeekStartsOn>("SUNDAY");

  useEffect(() => {
    if (data) {
      setDraft(data.weekStartsOn);
      setSaved(data.weekStartsOn);
    }
  }, [data]);

  const [dialogValue, setDialogValue] = useState<WeekStartsOn>("SUNDAY");

  return (
    <>
      <SettingsValueSection
        title="Start of the Week"
        description="This setting affects reports and the week view on mobile. Desktop week view always starts with the current day."
        valueLabel={formatWeekStartLabel(draft)}
        onEdit={() => {
          setDialogValue(draft);
          setDialogOpen(true);
        }}
        onDiscard={() => setDraft(saved)}
        onSave={() =>
          mutation.mutate(() => updateWeekStart({ weekStartsOn: draft }), {
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
            <DialogTitle>Start of the Week</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {WEEK_START_OPTIONS.map((option) => (
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
