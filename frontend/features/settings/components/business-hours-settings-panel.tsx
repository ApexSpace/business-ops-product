"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import { SettingsFormStack } from "@/components/forms/settings-form-grid";
import { BusinessHoursEditor } from "@/features/business-hours/components/business-hours-editor";
import {
  defaultBusinessHoursSlots,
  normalizeBusinessHoursSlots,
} from "@/features/business-hours/utils/default-business-hours";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import {
  getBusinessHours,
  updateBusinessHours,
} from "@/features/online-booking-settings/api/online-booking-settings.api";

interface BusinessHoursSettingsPanelProps {
  disabled?: boolean;
  /** When true, hide the intro — parent chrome already provides title. */
  embedded?: boolean;
}

function slotsSignature(slots: BusinessHoursSlot[]): string {
  return JSON.stringify(slots);
}

export function BusinessHoursSettingsPanel({
  disabled = false,
  embedded = false,
}: BusinessHoursSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );
  const [baseline, setBaseline] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["business-hours"],
    queryFn: getBusinessHours,
  });

  useEffect(() => {
    if (data?.slots) {
      const next = normalizeBusinessHoursSlots(data.slots);
      setSlots(next);
      setBaseline(next);
    }
  }, [data]);

  const isDirty = useMemo(
    () => slotsSignature(slots) !== slotsSignature(baseline),
    [slots, baseline],
  );

  const saveMutation = useMutation({
    mutationFn: () => updateBusinessHours({ slots }),
    onSuccess: () => {
      toast.success("Business hours saved");
      setBaseline(slots);
      void queryClient.invalidateQueries({ queryKey: ["business-hours"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <LoadingState variant="inline" label="Loading hours…" />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <SettingsFormStack>
        {!embedded ? (
          <div>
            <h3 className="text-base font-medium">Business hours</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When your business accepts online bookings each week. Staff can
              override these with their own schedule from the team settings.
            </p>
          </div>
        ) : null}

        <BusinessHoursEditor
          slots={slots}
          disabled={disabled}
          onChange={setSlots}
        />

        {disabled ? (
          <p className="text-sm text-muted-foreground">
            Only owners, admins, and platform administrators can edit business
            hours.
          </p>
        ) : (
          <SettingsFormActions
            onDiscard={() => setSlots(baseline)}
            isDirty={isDirty}
            isSubmitting={saveMutation.isPending}
          />
        )}
      </SettingsFormStack>
    </form>
  );
}
