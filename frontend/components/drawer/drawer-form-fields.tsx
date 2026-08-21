"use client";

import type { ReactNode } from "react";
import { APPOINTMENT_DRAWER_FORM_FIELDS_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

/** Figma Form Fields — vertical stack, fill container width, gap 24px. */
export function DrawerFormFields({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_FORM_FIELDS_CLASS, className)}>
      {children}
    </div>
  );
}
