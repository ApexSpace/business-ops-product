"use client";

import { useQuery } from "@tanstack/react-query";
import { getSchedulingSettings } from "@/features/scheduling-settings/api/scheduling-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useSchedulingSettings() {
  return useQuery({
    queryKey: queryKeys.schedulingSettings.detail(),
    queryFn: getSchedulingSettings,
  });
}
