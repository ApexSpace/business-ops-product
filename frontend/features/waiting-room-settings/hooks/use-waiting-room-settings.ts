"use client";

import { useQuery } from "@tanstack/react-query";
import { getWaitingRoomSettings } from "@/features/waiting-room-settings/api/waiting-room-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useWaitingRoomSettings() {
  return useQuery({
    queryKey: queryKeys.waitingRoomSettings.detail(),
    queryFn: getWaitingRoomSettings,
  });
}
