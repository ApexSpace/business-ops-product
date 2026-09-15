"use client";

import { useQuery } from "@tanstack/react-query";
import { getOnlineBookingSettings } from "@/features/online-booking-settings/api/online-booking-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useOnlineBookingSettings() {
  return useQuery({
    queryKey: queryKeys.onlineBookingSettings.detail(),
    queryFn: getOnlineBookingSettings,
  });
}
