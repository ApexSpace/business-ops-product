"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onSave: (
    body: AnyoneAssignmentsDraft,
    options?: { onSuccess?: () => void },
  ) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AnyoneAssignmentsDraft>(() =>
    pickDraft(data),
  );
  const [saved, setSaved] = useState<AnyoneAssignmentsDraft>(() =>
    pickDraft(data),
  );

  useEffect(() => {
    const next = pickDraft(data);
    setSaved(next);
    if (!isEditing) setDraft(next);
  }, [data, isEditing]);

  const summary = useMemo(
    () => formatAnyoneAssignmentsSummary(saved, labelsById),
    [saved, labelsById],
  );

  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const handleDiscard = useCallback(() => {
    setDraft(saved);
    setIsEditing(false);
  }, [saved]);

  return (
    <SettingsInlineEditSection
      title={`"Anyone" staff assignments`}
      description={`Select how staff members are assigned to appointments when clients choose "Anyone" when booking online.`}
      summary={
        <SettingsViewRows
          rows={[{ label: "Anyone assignments", value: summary }]}
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
    </SettingsInlineEditSection>
  );
}
