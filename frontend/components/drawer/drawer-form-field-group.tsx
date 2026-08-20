"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  APPOINTMENT_DRAWER_FIELD_GROUP_CLASS,
  APPOINTMENT_DRAWER_FIELD_LABEL_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

/** Figma field group — label + control, gap 8px, hug height. */
export function DrawerFormFieldGroup({
  label,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(APPOINTMENT_DRAWER_FIELD_GROUP_CLASS, className)}>
      {label ? (
        <Label htmlFor={htmlFor} className={APPOINTMENT_DRAWER_FIELD_LABEL_CLASS}>
          {label}
        </Label>
      ) : null}
      {children}
    </div>
  );
}
