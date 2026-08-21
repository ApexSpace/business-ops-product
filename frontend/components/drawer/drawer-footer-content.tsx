"use client";

import type { ReactNode } from "react";
import { APPOINTMENT_DRAWER_FOOTER_INNER_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

/** Figma Footer inner stack — vertical · fill width · gap 15px. */
export function DrawerFooterContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_FOOTER_INNER_CLASS, className)}>
      {children}
    </div>
  );
}
