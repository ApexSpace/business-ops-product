"use client";

import { createContext, useContext } from "react";
import type {
  CalendarZoomLevel,
  WeekStartsOn,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { slotHeightForZoom } from "@/features/calendar-display-settings/utils/calendar-display-runtime.util";

export type CalendarDisplayRuntimeValue = {
  slotHeightPx: number;
  weekStartsOn: WeekStartsOn;
  highContrastEnabled: boolean;
};

const DEFAULT_RUNTIME: CalendarDisplayRuntimeValue = {
  slotHeightPx: slotHeightForZoom("MEDIUM"),
  weekStartsOn: "SUNDAY",
  highContrastEnabled: false,
};

const CalendarDisplayRuntimeContext =
  createContext<CalendarDisplayRuntimeValue>(DEFAULT_RUNTIME);

export function CalendarDisplayRuntimeProvider({
  weekStartsOn = "SUNDAY",
  zoomLevel = "MEDIUM",
  highContrastEnabled = false,
  children,
}: {
  weekStartsOn?: WeekStartsOn;
  zoomLevel?: CalendarZoomLevel;
  highContrastEnabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <CalendarDisplayRuntimeContext.Provider
      value={{
        slotHeightPx: slotHeightForZoom(zoomLevel),
        weekStartsOn,
        highContrastEnabled,
      }}
    >
      {children}
    </CalendarDisplayRuntimeContext.Provider>
  );
}

export function useCalendarDisplayRuntime(): CalendarDisplayRuntimeValue {
  return useContext(CalendarDisplayRuntimeContext);
}
