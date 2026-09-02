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
import { Switch } from "@/components/ui/switch";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CancelledDraft>(DEFAULT_CANCELLED);
  const [saved, setSaved] = useState<CancelledDraft>(DEFAULT_CANCELLED);
  const [dialogValue, setDialogValue] = useState<CancelledDraft>(DEFAULT_CANCELLED);

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

  return (
    <>
      <SettingsValueSection
        title="Visibility of Canceled Appointments"
        description="Choose which types of cancellations remain visible on the calendar."
        valueLabel={formatCancelledVisibilityLabel(draft)}
        onEdit={() => {
          setDialogValue(draft);
          setDialogOpen(true);
        }}
        onDiscard={() => setDraft(saved)}
        onSave={() =>
          mutation.mutate(() => updateCancelledVisibility(draft), {
            onSuccess: () => setSaved(draft),
          })
        }
        isDirty={JSON.stringify(draft) !== JSON.stringify(saved)}
        isSaving={mutation.isPending}
        disabled={!canEdit}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Visibility of Canceled Appointments</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { key: "showNormalCancellation" as const, label: "Normal cancellation" },
              { key: "showLateCancellation" as const, label: "Late cancellation" },
              { key: "showNoShow" as const, label: "No show" },
            ].map((item) => (
              <div
                key={item.key}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2",
                  dialogValue[item.key] && "border-primary bg-primary/5",
                )}
              >
                <Label htmlFor={`cancelled-${item.key}`}>{item.label}</Label>
                <Switch
                  id={`cancelled-${item.key}`}
                  checked={dialogValue[item.key]}
                  onCheckedChange={(checked) =>
                    setDialogValue((current) => ({
                      ...current,
                      [item.key]: checked,
                    }))
                  }
                />
              </div>
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
