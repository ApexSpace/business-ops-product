"use client";

import type { ReactNode } from "react";
import {
  APPOINTMENT_DRAWER_DATE_EYEBROW_CLASS,
  APPOINTMENT_DRAWER_HEADER_CONTENT_CLASS,
  APPOINTMENT_DRAWER_TITLE_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerHeaderContentProps {
  eyebrow?: string;
  title: ReactNode;
  className?: string;
}

export function DrawerHeaderContent({
  eyebrow,
  title,
  className,
}: DrawerHeaderContentProps) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_HEADER_CONTENT_CLASS, className)}>
      {eyebrow ? (
        <p className={APPOINTMENT_DRAWER_DATE_EYEBROW_CLASS}>{eyebrow}</p>
      ) : null}
      <span className={APPOINTMENT_DRAWER_TITLE_CLASS}>{title}</span>
    </div>
  );
}
