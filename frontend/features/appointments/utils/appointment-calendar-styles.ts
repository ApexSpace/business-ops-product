import type { CSSProperties } from "react";
import type {
  Appointment,
  AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";

export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string }
> = {
  SCHEDULED: {
    bg: "bg-slate-500/[0.08]",
    border: "border-slate-400/40",
    text: "text-slate-800 dark:text-slate-200",
  },
  CONFIRMED: {
    bg: "bg-primary/[0.08]",
    border: "border-primary/35",
    text: "text-foreground",
  },
  COMPLETED: {
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/35",
    text: "text-emerald-800 dark:text-emerald-300",
  },
  CANCELLED: {
    bg: "bg-destructive/[0.06]",
    border: "border-destructive/30",
    text: "text-destructive/80 line-through",
  },
  NO_SHOW: {
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/35",
    text: "text-amber-900 dark:text-amber-300",
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
        backgroundColor: `${calendarColor}14`,
      },
    };
  }

  return {
    className: `${statusStyle.bg} ${statusStyle.border} border-l-[3px]`,
    style: calendarColor
      ? { borderLeftColor: calendarColor }
      : undefined,
  };
}
