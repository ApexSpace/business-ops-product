"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { BusinessHoursSlot } from "@/features/business-hours/types";
import { normalizeBusinessHoursSlots } from "@/features/business-hours/utils/default-business-hours";
import {
  getBusinessHours,
  getStaffWorkSchedule,
} from "@/features/online-booking-settings/api/online-booking-settings.api";

export function useAppointmentsWorkingHours(staffUserIds: string[]) {
  const { data: businessHoursData, isError: businessHoursError } = useQuery({
    queryKey: ["business-hours"],
    queryFn: getBusinessHours,
    retry: 1,
  });

  const uniqueStaffIds = useMemo(
    () => [...new Set(staffUserIds.filter(Boolean))],
    [staffUserIds],
  );

  const staffQueries = useQueries({
    queries: uniqueStaffIds.map((userId) => ({
      queryKey: ["staff-work-schedule", userId],
      queryFn: () => getStaffWorkSchedule(userId),
      enabled: !!userId,
    })),
  });

  const businessSlots = useMemo(() => {
    if (businessHoursData?.slots?.length) {
      return normalizeBusinessHoursSlots(businessHoursData.slots);
    }
    return normalizeBusinessHoursSlots([]);
  }, [businessHoursData?.slots]);

  const staffSlotsByUserId = useMemo(() => {
    const map = new Map<string, BusinessHoursSlot[] | null>();
    uniqueStaffIds.forEach((userId, index) => {
      const data = staffQueries[index]?.data;
      if (!data || data.useBusinessHours) {
        map.set(userId, null);
        return;
      }
      map.set(userId, normalizeBusinessHoursSlots(data.slots));
    });
    return map;
  }, [uniqueStaffIds, staffQueries]);

  const isLoading =
    (!businessHoursData && !businessHoursError) ||
    staffQueries.some((q) => q.isLoading && q.fetchStatus !== "idle");

  return {
    businessSlots,
    staffSlotsByUserId,
    isLoading,
    businessHoursError,
  };
}
