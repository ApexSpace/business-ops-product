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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsValueSection } from "@/components/layout/settings-value-section";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import type { OnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";
import { formatBookingWindowSummary } from "@/features/online-booking-settings/utils/online-booking-settings-labels";

type BookingWindowDraft = {
  maxBookingDays: number;
  minimumNoticeMinutes: number;
};

type BookingWindowSectionProps = {
  data: OnlineBookingSettings;
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (body: BookingWindowDraft) => void;
};

function pickDraft(data: OnlineBookingSettings): BookingWindowDraft {
  return {
    maxBookingDays: data.maxBookingDays,
    minimumNoticeMinutes: data.minimumNoticeMinutes,
  };
}

export function BookingWindowSection({
  data,
  disabled,
  isSaving,
  onSave,
}: BookingWindowSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<BookingWindowDraft>(() => pickDraft(data));

  const openDialog = useCallback(() => {
    setDraft(pickDraft(data));
    setDialogOpen(true);
  }, [data]);

  return (
    <>
      <SettingsValueSection
        title="Online Booking"
        description="Set the maximum time in the future for reservations and the minimum lead time required for a booking."
        valueLabel={formatBookingWindowSummary(data)}
        onEdit={openDialog}
        disabled={disabled || isSaving}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Online Booking</DialogTitle>
          </DialogHeader>
          <SettingsFormGrid>
            <div className="space-y-2">
              <Label htmlFor="max-booking-days">Maximum advance booking (days)</Label>
              <Input
                id="max-booking-days"
                type="number"
                min={1}
                value={draft.maxBookingDays}
                disabled={disabled || isSaving}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    maxBookingDays: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum-notice">Minimum prior time required (minutes)</Label>
              <Input
                id="minimum-notice"
                type="number"
                min={0}
                value={draft.minimumNoticeMinutes}
                disabled={disabled || isSaving}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    minimumNoticeMinutes: Number(e.target.value),
                  }))
                }
              />
            </div>
          </SettingsFormGrid>
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
