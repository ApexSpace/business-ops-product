"use client";

import type { ReactNode } from "react";
import { APPOINTMENT_DRAWER_BOOKING_DATETIME_ROW_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export function DrawerDateTimeRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_BOOKING_DATETIME_ROW_CLASS, className)}>
      {children}
    </div>
  );
}
