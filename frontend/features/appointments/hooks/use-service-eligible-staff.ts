"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAppointmentServiceStaff } from "@/features/appointments/api/appointments.api";
import type { StaffOption } from "@/features/appointments/utils/appointment-service-lines";
import { queryKeys } from "@/lib/query/keys";

/**
 * Staff who can actually provide `serviceId`.
 * Uses enabled ServiceStaff assignments; if the service has none, the API
 * returns all active members (same rule as checkout).
 */
export function useServiceEligibleStaff(
  serviceId: string | undefined,
  fallback: StaffOption[],
) {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.checkouts.serviceStaff(serviceId ?? ""),
    queryFn: () => listAppointmentServiceStaff(serviceId!),
    enabled: Boolean(serviceId),
    staleTime: 60_000,
  });

  const staffOptions = useMemo((): StaffOption[] => {
    if (!data?.items) return fallback;
    return data.items.map((item) => ({
      userId: item.id,
      label: item.label,
    }));
  }, [data?.items, fallback]);

  return { staffOptions, isPending,
};
}
