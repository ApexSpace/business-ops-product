"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import {
  APPOINTMENT_DRAWER_FIELD_CLASS,
  APPOINTMENT_DRAWER_FIELD_GROUP_CLASS,
  APPOINTMENT_DRAWER_FIELD_LABEL_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export interface DrawerFieldProps {
  label?: string;
  htmlFor?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  overlay?: ReactNode;
  children?: ReactNode;
  className?: string;
  fieldClassName?: string;
  disabled?: boolean;
  onClick?: () => void;
}

/** Reusable 44px drawer field shell with optional leading/trailing slots. */
export function DrawerField({
  label,
  htmlFor,
  leading,
  trailing,
  overlay,
  children,
  className,
  fieldClassName,
  disabled = false,
  onClick,
}: DrawerFieldProps) {
  const Comp = onClick ? "button" : "div";

  return (
    <div className={cn(APPOINTMENT_DRAWER_FIELD_GROUP_CLASS, className)}>
      {label ? (
        <Label htmlFor={htmlFor} className={APPOINTMENT_DRAWER_FIELD_LABEL_CLASS}>
          {label}
        </Label>
      ) : null}
      <Comp
        type={onClick ? "button" : undefined}
        disabled={onClick ? disabled : undefined}
        onClick={onClick}
        className={cn(
          APPOINTMENT_DRAWER_FIELD_CLASS,
          "relative flex w-full items-center gap-2 text-left",
          onClick && "cursor-pointer hover:bg-violet-primary-surface/40",
          disabled && "pointer-events-none opacity-60",
          fieldClassName,
        )}
      >
        {leading ? (
          <span className="relative z-[1] inline-flex shrink-0 items-center justify-center">
            {leading}
          </span>
        ) : null}
        <div className="relative z-[1] min-w-0 flex-1">{children}</div>
        {trailing ? (
          <span className="relative z-[1] inline-flex shrink-0 items-center justify-center">
            {trailing}
          </span>
        ) : null}
        {overlay}
      </Comp>
    </div>
  );
}
