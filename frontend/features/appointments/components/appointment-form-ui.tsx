"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import type { AppointmentStatus } from "@/features/appointments/schemas/appointment-profile";
import { getAppointmentStatusDotClass } from "@/features/appointments/utils/appointment-calendar-styles";
import { cn } from "@/lib/utils";

export const APPOINTMENT_STATUS_DOT_CLASS: Record<AppointmentStatus, string> = {
  PENDING_COMPLETION: getAppointmentStatusDotClass("PENDING_COMPLETION"),
  UNCONFIRMED: getAppointmentStatusDotClass("UNCONFIRMED"),
  CONFIRMED: getAppointmentStatusDotClass("CONFIRMED"),
  WAITING: getAppointmentStatusDotClass("WAITING"),
  IN_SERVICE: getAppointmentStatusDotClass("IN_SERVICE"),
  COMPLETED: getAppointmentStatusDotClass("COMPLETED"),
  CANCELLED: getAppointmentStatusDotClass("CANCELLED"),
  NO_SHOW: getAppointmentStatusDotClass("NO_SHOW"),
};

export function AppointmentColorDot({
  color,
  className,
}: {
  color?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn("size-[9px] shrink-0 rounded-full bg-primary", className)}
      style={color ? { backgroundColor: color } : undefined}
      aria-hidden
    />
  );
}

export function AppointmentFormAddButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-border/80 px-3 py-[11px] text-[13px] font-semibold text-muted-foreground transition-colors",
        "hover:border-primary hover:bg-primary/5 hover:text-primary",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <Plus className="size-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

export function OptionalFieldLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {children}
      <span className="font-medium text-muted-foreground/80">(optional)</span>
    </span>
  );
}
