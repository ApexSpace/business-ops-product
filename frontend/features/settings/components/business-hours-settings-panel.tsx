"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
}

export function BusinessHoursSettingsPanel({
  disabled = false,
}: BusinessHoursSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );

  const { data, isLoading } = useQuery({
    queryKey: ["business-hours"],
    queryFn: getBusinessHours,
  });

  useEffect(() => {
    if (data?.slots) {
      setSlots(normalizeBusinessHoursSlots(data.slots));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateBusinessHours({ slots }),
    onSuccess: () => {
      toast.success("Business hours saved");
      void queryClient.invalidateQueries({ queryKey: ["business-hours"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading hours…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium">Business hours</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          When your business accepts online bookings each week. Staff can
          override these with their own schedule from the team settings.
        </p>
      </div>

      <BusinessHoursEditor
        slots={slots}
        disabled={disabled}
        onChange={setSlots}
      />

      {!disabled ? (
        <Button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving…" : "Save business hours"}
        </Button>
      ) : null}
    </div>
  );
}
