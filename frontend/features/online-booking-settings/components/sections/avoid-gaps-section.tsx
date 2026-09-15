"use client";

import { useCallback, useEffect, useState } from "react";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
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
  onSave: (
    body: AvoidGapsDraft,
    options?: { onSuccess?: () => void },
  ) => void;
};

export function AvoidGapsSection({
  data,
  disabled,
  isSaving,
  onSave,
}: AvoidGapsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AvoidGapsDraft>(() =>
    pickAvoidGapsDraft(data),
  );
  const [saved, setSaved] = useState<AvoidGapsDraft>(() =>
    pickAvoidGapsDraft(data),
  );

  useEffect(() => {
    const next = pickAvoidGapsDraft(data);
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
      title="Avoid gaps between appointments"
      description="When enabled, the system only offers times that prevent unwanted gaps in service provider schedules."
      summary={
        <SettingsViewRows
          rows={[
            {
              label: "Avoid gaps",
              value: formatAvoidGapsSummary(saved),
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
      <AvoidGapsFormFields
        draft={draft}
        disabled={disabled || isSaving}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      />
    </SettingsInlineEditSection>
  );
}
