"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatAppointmentStatus,
  getAppointmentSyncIndicator,
  getContactDisplayName,
  type Appointment,
} from "@/lib/appointment-profile";
import {
  APPOINTMENT_STATUS_COLORS,
  getAppointmentEventStyle,
} from "@/lib/appointment-calendar-styles";
import { formatTime } from "@/lib/calendar-dates";

interface AppointmentEventCardProps {
  appointment: Appointment;
  timeZone?: string;
  compact?: boolean;
  /** Smaller padding/text; still stacks lines when space is tight */
  ultraCompact?: boolean;
  className?: string;
  onClick?: () => void;
}

function StackedLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("min-w-0 break-words leading-tight", className)}>{children}</p>
  );
}

export function AppointmentEventCard({
  appointment,
  timeZone,
  compact = false,
  ultraCompact = false,
  className,
  onClick,
}: AppointmentEventCardProps) {
  const { className: eventClass, style } = getAppointmentEventStyle(appointment);
  const statusColors = APPOINTMENT_STATUS_COLORS[appointment.status];
  const start = formatTime(appointment.startAt, timeZone);
  const end = formatTime(appointment.endAt, timeZone);
  const contactName = getContactDisplayName(appointment.contact);
  const syncIndicator = getAppointmentSyncIndicator(appointment);

  const interactive = Boolean(onClick);
  const narrow = compact || ultraCompact;

  return (
    <div
      data-calendar-appointment=""
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex w-full min-w-0 flex-col overflow-hidden rounded-md border text-left shadow-elevation-xs",
        ultraCompact ? "gap-0.5 px-1 py-0.5 text-[10px]" : "gap-0.5 px-2 py-1.5 text-xs",
        compact && !ultraCompact && "min-h-[2.125rem] gap-1",
        ultraCompact && "min-h-[1.375rem]",
        !narrow && "gap-1",
        interactive &&
          "cursor-pointer transition-[box-shadow,opacity] hover:opacity-95 hover:shadow-md",
        eventClass,
        statusColors.text,
        className,
      )}
      style={style}
    >
      <div className="flex min-w-0 items-start gap-1">
        <StackedLine
          className={cn(
            "min-w-0 flex-1 font-medium",
            ultraCompact && "text-[10px]",
            compact && !ultraCompact && "text-[11px]",
          )}
        >
          {appointment.title}
        </StackedLine>
        {syncIndicator ? (
          <span
            className={cn(
              "shrink-0 rounded px-1 py-0 text-[9px] font-medium leading-none",
              syncIndicator.variant === "google-error" &&
                "bg-destructive/15 text-destructive",
              syncIndicator.variant === "google-import" &&
                "bg-blue-500/15 text-blue-700 dark:text-blue-300",
              syncIndicator.variant === "google-sync" &&
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
            )}
            title={
              appointment.googleSyncWarning ?? syncIndicator.label
            }
          >
            {syncIndicator.label}
          </span>
        ) : null}
      </div>

      {ultraCompact ? (
        <StackedLine className="text-[10px] opacity-80">{start}</StackedLine>
      ) : narrow ? (
        <>
          <StackedLine className="text-[10px] opacity-80">
            {start} – {end}
          </StackedLine>
          {contactName ? (
            <StackedLine className="text-[10px] opacity-75">{contactName}</StackedLine>
          ) : null}
        </>
      ) : (
        <>
          <StackedLine className="text-[11px] opacity-80">
            {start} – {end}
          </StackedLine>
          {contactName ? (
            <StackedLine className="text-[11px] opacity-75">{contactName}</StackedLine>
          ) : null}
          {appointment.service ? (
            <StackedLine className="text-[11px] opacity-70">
              {appointment.service.name}
            </StackedLine>
          ) : null}
          <Badge
            variant="outline"
            className="mt-0.5 h-4 w-fit max-w-full shrink-0 px-1 text-[10px] font-normal"
          >
            {formatAppointmentStatus(appointment.status)}
          </Badge>
        </>
      )}
    </div>
  );
}
