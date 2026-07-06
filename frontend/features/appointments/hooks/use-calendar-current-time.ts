"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import {
  CALENDAR_DAY_START_HOUR,
  CALENDAR_SLOT_HEIGHT_PX,
  CALENDAR_SLOT_MINUTES,
  getTimeGridHeight,
} from "@/features/calendars/utils/calendar-dates";
import { isTodayDateKey } from "@/features/calendars/utils/timezone";

const GRID_HEIGHT = getTimeGridHeight();

export function useCalendarCurrentTimeTop(
  timezone: string,
  visibleDateKeys: string[],
): number | null {
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
      const gridStartMinutes = CALENDAR_DAY_START_HOUR * 60;
      const top =
        ((minutesFromMidnight - gridStartMinutes) / CALENDAR_SLOT_MINUTES) *
        CALENDAR_SLOT_HEIGHT_PX;

      if (top < 0 || top > GRID_HEIGHT) {
        setTopPx(null);
        return;
      }

      setTopPx(top);
    };

    update();
    const intervalId = window.setInterval(update, 60_000);
    return () => window.clearInterval(intervalId);
  }, [isTodayVisible, timezone]);

  return topPx;
}
