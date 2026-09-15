"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { useCalendarDisplayRuntime } from "@/features/calendar-display-settings/context/calendar-display-runtime-context";
import {
  CALENDAR_SLOT_MINUTES,
  getTimeGridHeight,
} from "@/features/calendars/utils/calendar-dates";
import { isTodayDateKey } from "@/features/calendars/utils/timezone";

export function useCalendarCurrentTimeTop(
  timezone: string,
  visibleDateKeys: string[],
): number | null {
  const { slotHeightPx, visibleStartMinutes, visibleEndMinutes } =
    useCalendarDisplayRuntime();
  const gridHeight = getTimeGridHeight(
    visibleStartMinutes / 60,
    visibleEndMinutes / 60,
    CALENDAR_SLOT_MINUTES,
    slotHeightPx,
  );
  const isTodayVisible = visibleDateKeys.some((dateKey) =>
    isTodayDateKey(dateKey, timezone),
  );
  const [topPx, setTopPx] = useState<number | null>(null);

  useEffect(() => {
    if (!isTodayVisible) {
      setTopPx(null);
      return;
    }

    const update = () => {
      const now = DateTime.now().setZone(timezone);
      const minutesFromMidnight = now.hour * 60 + now.minute + now.second / 60;
      const top =
        ((minutesFromMidnight - visibleStartMinutes) / CALENDAR_SLOT_MINUTES) *
        slotHeightPx;

      if (top < 0 || top > gridHeight) {
        setTopPx(null);
        return;
      }

      setTopPx(top);
    };

    update();
    const intervalId = window.setInterval(update, 60_000);
    return () => window.clearInterval(intervalId);
  }, [
    gridHeight,
    isTodayVisible,
    slotHeightPx,
    timezone,
    visibleStartMinutes,
  ]);

  return topPx;
}
