"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsFormGrid } from "@/components/forms/settings-form-grid";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  onSave: (
    body: BookingWindowDraft,
    options?: { onSuccess?: () => void },
  ) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<BookingWindowDraft>(() => pickDraft(data));
  const [saved, setSaved] = useState<BookingWindowDraft>(() => pickDraft(data));

  useEffect(() => {
    const next = pickDraft(data);
    setSaved(next);
    if (!isEditing) setDraft(next);
  }, [data, isEditing]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const handleDiscard = useCallback(() => {
    setDraft(saved);
    setIsEditing(false);
  }, [saved]);

  return (
    <SettingsInlineEditSection
      title="Online Booking"
      description="Set the maximum time in the future for reservations and the minimum lead time required for a booking."
      summary={
        <SettingsViewRows
          rows={[
            {
              label: "Booking window",
              value: formatBookingWindowSummary(saved),
            },
          ]}
        />
      }
      isEditing={isEditing}
      onEdit={() => {
        setDraft(saved);
        setIsEditing(true);
      }}
      onDiscard={handleDiscard}
      onSave={() =>
        onSave(draft, {
          onSuccess: () => {
            setSaved(draft);
            setIsEditing(false);
          },
        })
      }
      isDirty={isDirty}
      isSaving={isSaving}
      disabled={disabled}
    >
      <SettingsFormGrid>
        <div className="space-y-2">
          <Label htmlFor="max-booking-days">
            Maximum advance booking (days)
          </Label>
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
          <Label htmlFor="minimum-notice">
            Minimum prior time required (minutes)
          </Label>
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
    </SettingsInlineEditSection>
  );
}
