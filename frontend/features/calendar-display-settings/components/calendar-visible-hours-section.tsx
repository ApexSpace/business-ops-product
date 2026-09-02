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
import { Label } from "@/components/ui/label";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftStart, setDraftStart] = useState("00:00");
  const [draftEnd, setDraftEnd] = useState("24:00");
  const [savedStart, setSavedStart] = useState("00:00");
  const [savedEnd, setSavedEnd] = useState("24:00");
  const [dialogStart, setDialogStart] = useState("00:00");
  const [dialogEnd, setDialogEnd] = useState("24:00");

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
    <>
      <SettingsValueSection
        title="Visible hours"
        description="Set the time range shown in day and week calendar views."
        valueLabel={formatVisibleHoursLabel(draftStart, draftEnd)}
        onEdit={() => {
          setDialogStart(draftStart);
          setDialogEnd(draftEnd);
          setDialogOpen(true);
        }}
        onDiscard={() => {
          setDraftStart(savedStart);
          setDraftEnd(savedEnd);
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
              },
            },
          )
        }
        isDirty={isDirty}
        isSaving={mutation.isPending}
        disabled={!canEdit}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visible hours</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start time</Label>
              <div className="grid max-h-48 gap-1 overflow-y-auto">
                {TIME_OPTIONS.filter((option) => option.value !== "24:00").map(
                  (option) => (
                    <Button
                      key={`start-${option.value}`}
                      type="button"
                      variant={dialogStart === option.value ? "brand" : "outline"}
                      size="sm"
                      onClick={() => setDialogStart(option.value)}
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
                      variant={dialogEnd === option.value ? "brand" : "outline"}
                      size="sm"
                      onClick={() => setDialogEnd(option.value)}
                    >
                      {option.label}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              onClick={() => {
                setDraftStart(dialogStart);
                setDraftEnd(dialogEnd);
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
