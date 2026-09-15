"use client";

import { useQuery } from "@tanstack/react-query";
import { getCalendarDisplaySettings } from "@/features/calendar-display-settings/api/calendar-display-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useCalendarDisplaySettings() {
  return useQuery({
    queryKey: queryKeys.calendarDisplaySettings.detail(),
    queryFn: getCalendarDisplaySettings,
  });
}
