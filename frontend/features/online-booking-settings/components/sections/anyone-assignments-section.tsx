"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
import type { OnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";
import {
  OnlineBookingStaffMultiSelect,
  useOnlineBookingStaffOptions,
} from "@/features/online-booking-settings/components/shared/staff-multi-select";
import { formatAnyoneAssignmentsSummary } from "@/features/online-booking-settings/utils/online-booking-settings-labels";

type AnyoneAssignmentsDraft = {
  anyoneAssignmentMode: string;
  anyoneExcludedStaffIds: string[];
};

type AnyoneAssignmentsSectionProps = {
  data: OnlineBookingSettings;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (body: AnyoneAssignmentsDraft) => void;
};

function pickDraft(data: OnlineBookingSettings): AnyoneAssignmentsDraft {
  return {
    anyoneAssignmentMode: data.anyoneAssignmentMode,
    anyoneExcludedStaffIds: data.anyoneExcludedStaffIds ?? [],
  };
}

export function AnyoneAssignmentsSection({
  data,
  disabled,
  isSaving,
  onSave,
}: AnyoneAssignmentsSectionProps) {
  const { labelsById } = useOnlineBookingStaffOptions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<AnyoneAssignmentsDraft>(() =>
    pickDraft(data),
  );

  const summary = useMemo(
    () => formatAnyoneAssignmentsSummary(data, labelsById),
    [data, labelsById],
  );

  const openDialog = useCallback(() => {
    setDraft(pickDraft(data));
    setDialogOpen(true);
  }, [data]);

  return (
    <>
      <SettingsValueSection
        title={`"Anyone" staff assignments`}
        description={`Select how staff members are assigned to appointments when clients choose "Anyone" when booking online.`}
        valueLabel={summary}
        onEdit={openDialog}
        disabled={disabled || isSaving}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`"Anyone" staff assignments`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign staff members</Label>
              <Select
                value={draft.anyoneAssignmentMode}
                disabled={disabled || isSaving}
                onValueChange={(value) => {
                  if (!value) return;
                  setDraft((current) => ({
                    ...current,
                    anyoneAssignmentMode: value,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RANDOM">Randomly</SelectItem>
                  <SelectItem value="ORDER">By staff order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <OnlineBookingStaffMultiSelect
              value={draft.anyoneExcludedStaffIds}
              disabled={disabled || isSaving}
              onChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  anyoneExcludedStaffIds: next,
                }))
              }
            />
          </div>
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
