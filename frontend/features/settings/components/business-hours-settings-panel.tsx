"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import {
  SettingsContentShell,
  SettingsFormSection,
  SettingsPageLayout,
} from "@/components/layout/settings-page-layout";
import {
  BusinessHoursWeekList,
  WeekRangeHeader,
} from "@/features/business-hours/components/business-hours-week-list";
import {
  defaultBusinessHoursSlots,
  normalizeBusinessHoursSlots,
} from "@/features/business-hours/utils/default-business-hours";
import type { BusinessHoursSlot, DayOfWeek } from "@/features/business-hours/types";
import {
  getBusinessHours,
  updateBusinessHours,
} from "@/features/online-booking-settings/api/online-booking-settings.api";
import { addDays } from "@/features/calendars/utils/calendar-dates";

interface BusinessHoursSettingsPanelProps {
  disabled?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export function BusinessHoursSettingsPanel({
  disabled = false,
  title = "Business Hours",
  description = "Manage your business hours.",
  className,
}: BusinessHoursSettingsPanelProps) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );
  const [anchorDate, setAnchorDate] = useState(() => new Date());

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
    mutationFn: (nextSlots: BusinessHoursSlot[]) =>
      updateBusinessHours({ slots: nextSlots }),
    onSuccess: (_data, nextSlots) => {
      toast.success("Business hours saved");
      setSlots(nextSlots);
      void queryClient.invalidateQueries({ queryKey: ["business-hours"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveDay = useCallback(
    (dayOfWeek: DayOfWeek, slot: BusinessHoursSlot) => {
      const nextSlots = slots.map((row) =>
        row.dayOfWeek === dayOfWeek ? slot : row,
      );
      saveMutation.mutate(nextSlots);
    },
    [saveMutation, slots],
  );

  const headerRow = useMemo(
    () => (
      <div className="flex w-full min-w-0 flex-wrap items-start justify-between gap-[var(--spacing-4)]">
        <SettingsFormSection title={title} description={description} />
        <WeekRangeHeader
          anchorDate={anchorDate}
          onPrevious={() => setAnchorDate((d) => addDays(d, -7))}
          onNext={() => setAnchorDate((d) => addDays(d, 7))}
          className="shrink-0"
        />
      </div>
    ),
    [anchorDate, description, title],
  );

  if (isLoading) {
    return <LoadingState variant="inline" label="Loading hours…" />;
  }

  const content = (
    <>
      {headerRow}
      <BusinessHoursWeekList
        slots={slots}
        disabled={disabled}
        isSaving={saveMutation.isPending}
        onSaveDay={handleSaveDay}
        hideWeekNavigator
        anchorDate={anchorDate}
        onAnchorDateChange={setAnchorDate}
      />
      {disabled ? (
        <p className="text-sm text-muted-foreground">
          Only owners, admins, and platform administrators can edit business
          hours.
        </p>
      ) : null}
    </>
  );

  return (
    <SettingsPageLayout className={className}>
      <SettingsContentShell>{content}</SettingsContentShell>
    </SettingsPageLayout>
  );
}
