"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
import type { OnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";
import {
  AvoidGapsFormFields,
  pickAvoidGapsDraft,
  type AvoidGapsDraft,
} from "@/features/online-booking-settings/components/sections/avoid-gaps-form-fields";
import { formatAvoidGapsSummary } from "@/features/online-booking-settings/utils/online-booking-settings-labels";

type AvoidGapsSectionProps = {
  data: OnlineBookingSettings;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (body: AvoidGapsDraft) => void;
};

export function AvoidGapsSection({
  data,
  disabled,
  isSaving,
  onSave,
}: AvoidGapsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<AvoidGapsDraft>(() =>
    pickAvoidGapsDraft(data),
  );

  const openDialog = useCallback(() => {
    setDraft(pickAvoidGapsDraft(data));
    setDialogOpen(true);
  }, [data]);

  return (
    <>
      <SettingsValueSection
        title="Avoid gaps between appointments"
        description="When enabled, the system only offers times that prevent unwanted gaps in service provider schedules."
        valueLabel={formatAvoidGapsSummary(data)}
        onEdit={openDialog}
        disabled={disabled || isSaving}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Avoid gaps between appointments</DialogTitle>
          </DialogHeader>
          <AvoidGapsFormFields
            draft={draft}
            disabled={disabled || isSaving}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={disabled || isSaving}
              onClick={() => {
                onSave(draft);
                setDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
