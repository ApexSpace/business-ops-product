"use client";

import type { BusinessHoursSlot } from "@/features/business-hours/types";
import {
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_SLOT_MINUTES,
} from "@/features/calendars/utils/calendar-dates";
import {
  dayOfWeekForDateKey,
  getNonWorkingOverlayBlocks,
  getWorkingWindowForDay,
  resolveEffectiveWeeklyHours,
} from "@/features/appointments/utils/working-hours";

function blockStyle(startMinutes: number, endMinutes: number) {
  const top = (startMinutes / CALENDAR_SLOT_MINUTES) * CALENDAR_SLOT_HEIGHT_PX;
  const height =
    ((endMinutes - startMinutes) / CALENDAR_SLOT_MINUTES) *
    CALENDAR_SLOT_HEIGHT_PX;
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
        );
        return (
          <div
            key={`${block.startMinutes}-${block.endMinutes}`}
            className="pointer-events-none absolute inset-x-0 z-[2] bg-neutral-200/70 dark:bg-neutral-800/55"
            style={{ top, height }}
            aria-hidden
          />
        );
      })}
    </>
  );
}
