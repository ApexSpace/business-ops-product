"use client";

import type { ReactNode } from "react";
import {
  getContactDisplayName,
  getAppointmentSyncIndicator,
  type Appointment,
} from "@/features/appointments/schemas/appointment-profile";
import {
  APPOINTMENT_STATUS_COLORS,
  getAppointmentEventStyle,
} from "@/features/appointments/utils/appointment-calendar-styles";
import { formatTime } from "@/features/calendars/utils/calendar-dates";
import { cn } from "@/lib/utils";

export type AppointmentEventCardVariant = "grid" | "month";

interface AppointmentEventCardProps {
  appointment: Appointment;
  timeZone?: string;
  variant?: AppointmentEventCardVariant;
  /** Pixel height of the grid block — controls secondary lines in day/week views. */
  eventHeight?: number;
  className?: string;
  onClick?: () => void;
}

function CardLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("min-w-0 truncate leading-tight", className)}>{children}</p>
  );
}

export function AppointmentEventCard({
  appointment,
  timeZone,
  variant = "grid",
  eventHeight,
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

  const showDetails =
    variant === "grid" && (eventHeight === undefined || eventHeight >= 72);
  const showSecondaryLine = variant === "grid";

  return (
    <div
      data-calendar-appointment=""
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (event) => {
              event.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-md border text-left",
        variant === "month"
          ? "gap-0.5 px-1.5 py-1 text-[10px]"
          : "gap-0.5 px-2 py-1.5 text-xs",
        interactive &&
          "cursor-pointer transition-[box-shadow,transform] hover:shadow-md active:scale-[0.995]",
        eventClass,
        statusColors.text,
        className,
      )}
      style={style}
    >
      <div className="flex min-w-0 items-start gap-1">
        <CardLine
          className={cn(
            "flex-1 font-semibold",
            variant === "month" ? "text-[10px]" : "text-xs",
          )}
        >
          {appointment.title}
        </CardLine>
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
            title={appointment.googleSyncWarning ?? syncIndicator.label}
          >
            {syncIndicator.label}
          </span>
        ) : null}
      </div>

      {showSecondaryLine ? (
        <CardLine className="text-[10px] opacity-80">
          {start} – {end}
        </CardLine>
      ) : null}

      {showDetails && contactName ? (
        <CardLine className="text-[10px] opacity-75">{contactName}</CardLine>
      ) : null}

      {showDetails && appointment.assignedTo ? (
        <CardLine className="text-[10px] opacity-70">
          {[
            appointment.assignedTo.firstName,
            appointment.assignedTo.lastName,
          ]
            .filter(Boolean)
            .join(" ") || appointment.assignedTo.email}
        </CardLine>
      ) : null}

      {variant === "month" ? (
        <CardLine className="text-[10px] opacity-75">{start}</CardLine>
      ) : null}
    </div>
  );
}
