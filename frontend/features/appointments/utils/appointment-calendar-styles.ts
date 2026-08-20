import type { CSSProperties } from "react";
import type {
  Appointment,
  AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";

/**
 * PandaCue Figma “Cards- Calendar” themes — pastel fill + matching 1px border + text.
 * Mapped by appointment status (and used for filters / dots).
 */
export type AppointmentCardTheme = {
  /** Solid pastel fill */
  bg: string;
  /** 1px border matching theme */
  border: string;
  /** Primary text (service + time) */
  text: string;
  /** Secondary text (client) — slightly softer */
  textMuted: string;
  /** Legend / status dot */
  dot: string;
  /** Extra classes (e.g. dashed pending, line-through cancelled) */
  extraClass?: string;
};

/** Figma green / mint */
const THEME_GREEN: AppointmentCardTheme = {
  bg: "#EAF7F0",
  border: "#B7DEC8",
  text: "#1A7A4C",
  textMuted: "#2D8F5E",
  dot: "#1C9A5B",
};

/** Figma purple / lavender */
const THEME_PURPLE: AppointmentCardTheme = {
  bg: "#F3EBFE",
  border: "#C9B0F0",
  text: "#5C2BB5",
  textMuted: "#7E3BED",
  dot: "#7E3BED",
};

/** Figma orange / peach */
const THEME_ORANGE: AppointmentCardTheme = {
  bg: "#FFF4EB",
  border: "#F0C9A8",
  text: "#B35A28",
  textMuted: "#C46D3A",
  dot: "#E07A3A",
};

/** Figma blue / sky */
const THEME_BLUE: AppointmentCardTheme = {
  bg: "#EBF3FC",
  border: "#A8C8E8",
  text: "#2A5FA8",
  textMuted: "#3D73BC",
  dot: "#3B82F6",
};

const THEME_SLATE: AppointmentCardTheme = {
  bg: "#F4F4F5",
  border: "#D4D4D8",
  text: "#52525B",
  textMuted: "#71717A",
  dot: "#A1A1AA",
};

const THEME_CANCELLED: AppointmentCardTheme = {
  bg: "#F9F5F5",
  border: "#E8C9C9",
  text: "#9F3A3A",
  textMuted: "#B85C5C",
  dot: "#A1A1AA",
  extraClass: "line-through opacity-80",
};

export const APPOINTMENT_STATUS_THEMES: Record<
  AppointmentStatus,
  AppointmentCardTheme
> = {
  CONFIRMED: THEME_GREEN,
  WAITING: THEME_PURPLE,
  IN_SERVICE: THEME_BLUE,
  UNCONFIRMED: THEME_ORANGE,
  PENDING_COMPLETION: {
    ...THEME_ORANGE,
    extraClass: "border-dashed",
  },
  COMPLETED: THEME_SLATE,
  CANCELLED: THEME_CANCELLED,
  NO_SHOW: {
    ...THEME_ORANGE,
    bg: "#FFF8F0",
    text: "#8A4B20",
    textMuted: "#A35C2C",
    extraClass: "opacity-90",
  },
};

/** @deprecated Prefer APPOINTMENT_STATUS_THEMES — kept for filter dots / badges */
export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  PENDING_COMPLETION: {
    bg: "bg-[#FFF4EB]",
    border: "border-[#F0C9A8]",
    text: "text-[#B35A28]",
    dot: "bg-[#E07A3A]",
  },
  UNCONFIRMED: {
    bg: "bg-[#FFF4EB]",
    border: "border-[#F0C9A8]",
    text: "text-[#B35A28]",
    dot: "bg-[#E07A3A]",
  },
  CONFIRMED: {
    bg: "bg-[#EAF7F0]",
    border: "border-[#B7DEC8]",
    text: "text-[#1A7A4C]",
    dot: "bg-[#1C9A5B]",
  },
  WAITING: {
    bg: "bg-[#F3EBFE]",
    border: "border-[#C9B0F0]",
    text: "text-[#5C2BB5]",
    dot: "bg-[#7E3BED]",
  },
  IN_SERVICE: {
    bg: "bg-[#EBF3FC]",
    border: "border-[#A8C8E8]",
    text: "text-[#2A5FA8]",
    dot: "bg-[#3B82F6]",
  },
  COMPLETED: {
    bg: "bg-[#F4F4F5]",
    border: "border-[#D4D4D8]",
    text: "text-[#52525B]",
    dot: "bg-[#A1A1AA]",
  },
  CANCELLED: {
    bg: "bg-[#F9F5F5]",
    border: "border-[#E8C9C9]",
    text: "text-[#9F3A3A]",
    dot: "bg-[#A1A1AA]",
  },
  NO_SHOW: {
    bg: "bg-[#FFF8F0]",
    border: "border-[#F0C9A8]",
    text: "text-[#8A4B20]",
    dot: "bg-[#E07A3A]",
  },
};

export function getAppointmentCardTheme(
  appointment: Pick<Appointment, "status">,
): AppointmentCardTheme {
  return APPOINTMENT_STATUS_THEMES[appointment.status];
}

export function getAppointmentEventStyle(appointment: Appointment): {
  className: string;
  style?: CSSProperties;
} {
  const theme = getAppointmentCardTheme(appointment);

  return {
    className: theme.extraClass ?? "",
    style: {
      backgroundColor: theme.bg,
      borderColor: theme.border,
      color: theme.text,
    },
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

/** Figma card time: "8:00AM - 9:00PM" (no space before meridiem). */
export function formatAppointmentCardTimeRange(
  startAt: string,
  endAt: string,
  timeZone?: string,
): string {
  const compact = (iso: string) => {
    const raw = timeZone
      ? formatTimeInTimezoneLocal(iso, timeZone)
      : formatTimeLocal(iso);
    return raw.replace(/\s+(am|pm)/i, (_, m: string) => m.toUpperCase());
  };
  return `${compact(startAt)} - ${compact(endAt)}`;
}

function formatTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeInTimezoneLocal(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return formatTimeLocal(iso);
  }
}
