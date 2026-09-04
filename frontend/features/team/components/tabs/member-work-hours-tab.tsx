"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/data-display/loading-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BusinessHoursWeekList } from "@/features/business-hours/components/business-hours-week-list";
import {
  defaultBusinessHoursSlots,
  normalizeBusinessHoursSlots,
} from "@/features/business-hours/utils/default-business-hours";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import {
  getStaffWorkSchedule,
  updateStaffWorkSchedule,
} from "@/features/online-booking-settings/api/online-booking-settings.api";
import { DRAWER_SWITCH_CLASS } from "@/lib/design/drawer-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  canManage: boolean;
};

export function MemberWorkHoursTab({ userId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [useBusinessHours, setUseBusinessHours] = useState(true);
  const [scheduleSlots, setScheduleSlots] = useState<BusinessHoursSlot[]>(
    defaultBusinessHoursSlots(),
  );
  const [savingDay, setSavingDay] = useState(false);

  const scheduleQuery = useQuery({
    queryKey: ["staff-work-schedule", userId],
    queryFn: () => getStaffWorkSchedule(userId),
  });

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setUseBusinessHours(scheduleQuery.data.useBusinessHours);
    setScheduleSlots(normalizeBusinessHoursSlots(scheduleQuery.data.slots));
  }, [scheduleQuery.data]);

  const persistSchedule = async (next: {
    useBusinessHours: boolean;
    slots: BusinessHoursSlot[];
  }) => {
    await updateStaffWorkSchedule(userId, {
      useBusinessHours: next.useBusinessHours,
      slots: next.useBusinessHours ? [] : next.slots,
    });
    await queryClient.invalidateQueries({
      queryKey: ["staff-work-schedule", userId],
    });
  };

  const toggleMutation = useMutation({
    mutationFn: async (nextUseBusinessHours: boolean) => {
      const slots = nextUseBusinessHours
        ? scheduleSlots
        : normalizeBusinessHoursSlots(
            scheduleSlots.length
              ? scheduleSlots
              : defaultBusinessHoursSlots(),
          );
      if (!nextUseBusinessHours && scheduleSlots.every((s) => !s.isEnabled)) {
        // Keep defaults when switching to custom with empty/disabled template
      }
      setUseBusinessHours(nextUseBusinessHours);
      if (!nextUseBusinessHours) {
        setScheduleSlots(normalizeBusinessHoursSlots(slots));
      }
      await persistSchedule({
        useBusinessHours: nextUseBusinessHours,
        slots: normalizeBusinessHoursSlots(slots),
      });
    },
    onSuccess: () => toast.success("Work hours saved"),
    onError: (err: Error) => {
      toast.error(err.message);
      if (scheduleQuery.data) {
        setUseBusinessHours(scheduleQuery.data.useBusinessHours);
        setScheduleSlots(
          normalizeBusinessHoursSlots(scheduleQuery.data.slots),
        );
      }
    },
  });

  const handleSaveDay = async (
    dayOfWeek: BusinessHoursSlot["dayOfWeek"],
    slot: BusinessHoursSlot,
  ) => {
    const nextSlots = scheduleSlots.map((row) =>
      row.dayOfWeek === dayOfWeek ? slot : row,
    );
    setScheduleSlots(nextSlots);
    setSavingDay(true);
    try {
      await persistSchedule({
        useBusinessHours: false,
        slots: nextSlots,
      });
      toast.success("Day hours saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save hours");
      if (scheduleQuery.data) {
        setScheduleSlots(
          normalizeBusinessHoursSlots(scheduleQuery.data.slots),
        );
      }
    } finally {
      setSavingDay(false);
    }
  };

  if (scheduleQuery.isLoading) {
    return <LoadingState variant="inline" />;
  }

  return (
    <div className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, "max-w-3xl")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Label className="text-sm font-medium">Use business hours</Label>
          <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>
            When enabled, this staff member follows the business weekly
            schedule.
          </p>
        </div>
        <Switch
          checked={useBusinessHours}
          disabled={!canManage || toggleMutation.isPending}
          onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          className={DRAWER_SWITCH_CLASS}
        />
      </div>

      {!useBusinessHours ? (
        <BusinessHoursWeekList
          slots={scheduleSlots}
          disabled={!canManage}
          isSaving={savingDay}
          onSaveDay={handleSaveDay}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Custom hours are hidden while business hours are in use. Turn the
          toggle off to set a personal weekly schedule.
        </p>
      )}
    </div>
  );
}
