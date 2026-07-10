import type { CSSProperties } from "react";
import type {
  Appointment,
  AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";

export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  UNCONFIRMED: {
    bg: "bg-orange-500/[0.1]",
    border: "border-orange-400/40",
    text: "text-orange-900 dark:text-orange-200",
    dot: "bg-orange-400",
  },
  CONFIRMED: {
    bg: "bg-teal-500/[0.1]",
    border: "border-teal-400/40",
    text: "text-teal-900 dark:text-teal-200",
    dot: "bg-teal-400",
  },
  WAITING: {
    bg: "bg-violet-500/[0.1]",
    border: "border-violet-400/40",
    text: "text-violet-900 dark:text-violet-200",
    dot: "bg-violet-400",
  },
  IN_SERVICE: {
    bg: "bg-pink-500/[0.1]",
    border: "border-pink-400/40",
    text: "text-pink-900 dark:text-pink-200",
    dot: "bg-pink-400",
  },
  COMPLETED: {
    bg: "bg-slate-500/[0.08]",
    border: "border-slate-400/40",
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  CANCELLED: {
    bg: "bg-destructive/[0.06]",
    border: "border-destructive/30",
    text: "text-destructive/80 line-through",
    dot: "bg-muted-foreground",
  },
  NO_SHOW: {
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/35",
    text: "text-amber-900 dark:text-amber-300",
    dot: "bg-amber-400",
  },
};

export function getAppointmentEventStyle(appointment: Appointment): {
  className: string;
  style?: CSSProperties;
} {
  const statusStyle = APPOINTMENT_STATUS_COLORS[appointment.status];

  return {
    className: `${statusStyle.bg} ${statusStyle.border} border-l-[3px] ${statusStyle.text}`,
  };
}

export function getAppointmentStatusDotClass(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_COLORS[status].dot;
}

export function getAppointmentStatusBadgeClass(
  status: AppointmentStatus,
): string {
  const colors = APPOINTMENT_STATUS_COLORS[status];
  return `${colors.bg} ${colors.border} ${colors.text} border`;
}
