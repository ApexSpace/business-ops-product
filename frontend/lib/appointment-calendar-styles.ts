import type { CSSProperties } from "react";
import type { Appointment, AppointmentStatus } from "@/lib/appointment-profile";

export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string }
> = {
  SCHEDULED: {
    bg: "bg-slate-500/10",
    border: "border-slate-400/50",
    text: "text-slate-700 dark:text-slate-300",
  },
  CONFIRMED: {
    bg: "bg-primary/12",
    border: "border-primary/40",
    text: "text-primary",
  },
  COMPLETED: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  CANCELLED: {
    bg: "bg-destructive/8",
    border: "border-destructive/35",
    text: "text-destructive/80 line-through",
  },
  NO_SHOW: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    text: "text-amber-800 dark:text-amber-400",
  },
};

export function getAppointmentEventStyle(appointment: Appointment): {
  className: string;
  style?: CSSProperties;
} {
  const statusStyle = APPOINTMENT_STATUS_COLORS[appointment.status];
  const calendarColor = appointment.calendar.color;

  if (calendarColor && appointment.status !== "CANCELLED") {
    return {
      className: `${statusStyle.bg} border-l-[3px]`,
      style: {
        borderLeftColor: calendarColor,
        backgroundColor: `${calendarColor}18`,
      },
    };
  }

  return {
    className: `${statusStyle.bg} ${statusStyle.border} border-l-[3px]`,
  };
}
