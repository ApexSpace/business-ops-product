"use client";

import type { ReactNode } from "react";
import { DRAWER_BOOKING_DATETIME_ROW_CLASS } from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

export function DrawerDateTimeRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(DRAWER_BOOKING_DATETIME_ROW_CLASS, className)}>
      {children}
    </div>
  );
}
