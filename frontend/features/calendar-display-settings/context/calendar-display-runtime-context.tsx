"use client";

import { createContext, useContext, useMemo } from "react";
import type {
  CalendarZoomLevel,
  WeekStartsOn,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import {
  parseVisibleTimeToMinutes,
  slotHeightForZoom,
} from "@/features/calendar-display-settings/utils/calendar-display-runtime.util";

export type CalendarDisplayRuntimeValue = {
  slotHeightPx: number;
  weekStartsOn: WeekStartsOn;
  highContrastEnabled: boolean;
  /** Inclusive grid window start (minutes from midnight). */
  visibleStartMinutes: number;
  /** Exclusive grid window end (minutes from midnight; 1440 = end of day). */
  visibleEndMinutes: number;
  /** Fractional hours for helpers that still take hour bounds. */
  visibleStartHour: number;
  visibleEndHour: number;
};

const DEFAULT_RUNTIME: CalendarDisplayRuntimeValue = {
  slotHeightPx: slotHeightForZoom("MEDIUM"),
  weekStartsOn: "SUNDAY",
  highContrastEnabled: false,
  visibleStartMinutes: 0,
  visibleEndMinutes: 24 * 60,
  visibleStartHour: 0,
  visibleEndHour: 24,
};

const CalendarDisplayRuntimeContext =
  createContext<CalendarDisplayRuntimeValue>(DEFAULT_RUNTIME);

export function CalendarDisplayRuntimeProvider({
  weekStartsOn = "SUNDAY",
  zoomLevel = "MEDIUM",
  highContrastEnabled = false,
  visibleStartTime = "00:00",
  visibleEndTime = "24:00",
  children,
}: {
  weekStartsOn?: WeekStartsOn;
  zoomLevel?: CalendarZoomLevel;
  highContrastEnabled?: boolean;
  visibleStartTime?: string;
  visibleEndTime?: string;
  children: React.ReactNode;
}) {
  const value = useMemo((): CalendarDisplayRuntimeValue => {
    const visibleStartMinutes = parseVisibleTimeToMinutes(visibleStartTime);
    const visibleEndMinutes = parseVisibleTimeToMinutes(visibleEndTime);
    const safeEnd =
      visibleEndMinutes > visibleStartMinutes
        ? visibleEndMinutes
        : visibleStartMinutes + 60;
    return {
      slotHeightPx: slotHeightForZoom(zoomLevel),
      weekStartsOn,
      highContrastEnabled,
      visibleStartMinutes,
      visibleEndMinutes: safeEnd,
      visibleStartHour: visibleStartMinutes / 60,
      visibleEndHour: safeEnd / 60,
    };
  }, [
    highContrastEnabled,
    visibleEndTime,
    visibleStartTime,
    weekStartsOn,
    zoomLevel,
  ]);

  return (
    <CalendarDisplayRuntimeContext.Provider value={value}>
      {children}
    </CalendarDisplayRuntimeContext.Provider>
  );
}

export function useCalendarDisplayRuntime(): CalendarDisplayRuntimeValue {
  return useContext(CalendarDisplayRuntimeContext);
}
