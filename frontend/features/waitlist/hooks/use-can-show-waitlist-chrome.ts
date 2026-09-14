"use client";

import { useCalendarStaffPermissions } from "@/features/appointments/hooks/use-calendar-staff-permissions";
import { canShowWaitlistChrome } from "@/features/waitlist/utils/waitlist-access";
import { useBusinessAccess } from "@/lib/business-access/use-business-access";

export function useCanShowWaitlistChrome(): boolean {
  const { hasCapability } = useBusinessAccess();
  const { canManageWaitlist } = useCalendarStaffPermissions();
  return canShowWaitlistChrome({
    hasWaitlistCapability: hasCapability("appointments.waitlist"),
    canManageWaitlist,
  });
}
