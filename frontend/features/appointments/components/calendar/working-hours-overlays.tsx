"use client";

import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { useCalendarDisplayRuntime } from "@/features/calendar-display-settings/context/calendar-display-runtime-context";
import { CALENDAR_SLOT_MINUTES } from "@/features/calendars/utils/calendar-dates";
import {
  dayOfWeekForDateKey,
  getNonWorkingOverlayBlocks,
  getWorkingWindowForDay,
  resolveEffectiveWeeklyHours,
} from "@/features/appointments/utils/working-hours";
import { cn } from "@/lib/utils";

function blockStyle(
  startMinutes: number,
  endMinutes: number,
  slotHeightPx: number,
) {
  const top = (startMinutes / CALENDAR_SLOT_MINUTES) * slotHeightPx;
  const height =
    ((endMinutes - startMinutes) / CALENDAR_SLOT_MINUTES) * slotHeightPx;
  return { top, height };
}

interface WorkingHoursOverlaysProps {
  dateKey: string;
  timezone: string;
  businessSlots: BusinessHoursSlot[];
  staffSlots?: BusinessHoursSlot[] | null;
}

export function WorkingHoursOverlays({
  dateKey,
  timezone,
  businessSlots,
  staffSlots,
}: WorkingHoursOverlaysProps) {
  const { slotHeightPx, highContrastEnabled } = useCalendarDisplayRuntime();
  const weekly = resolveEffectiveWeeklyHours(businessSlots, staffSlots ?? undefined);
  const dayOfWeek = dayOfWeekForDateKey(dateKey, timezone);
  const window = getWorkingWindowForDay(weekly, dayOfWeek);
  const blocks = getNonWorkingOverlayBlocks(window);

  return (
    <>
      {blocks.map((block) => {
        const { top, height } = blockStyle(
          block.startMinutes,
          block.endMinutes,
          slotHeightPx,
        );
        return (
          <div
            key={`${block.startMinutes}-${block.endMinutes}`}
            className={cn(
              "pointer-events-none absolute inset-x-0 z-[2]",
              highContrastEnabled
                ? "bg-[#8A8A8A]/35 dark:bg-neutral-700/55"
                : "bg-[#BC9BF6]/15 dark:bg-neutral-800/40",
            )}
            style={{ top, height }}
            aria-hidden
          />
        );
      })}
    </>
  );
}
