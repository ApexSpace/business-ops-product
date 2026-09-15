import type { CSSProperties } from "react";
import type {
  Appointment,
  AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";

/**
 * PandaCue Figma “Cards- Calendar” themes — pastel fill + matching 1px border + text.
 * Mapped by appointment status (and used for filters / dots).
 * Colors use theme CSS variables (no hardcoded brand hex).
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

/** Green / mint — success tokens */
const THEME_GREEN: AppointmentCardTheme = {
  bg: "var(--pc-green-success-light)",
  border: "var(--pc-green-success-light-active)",
  text: "var(--pc-green-success-dark)",
  textMuted: "var(--pc-green-success-normal-hover)",
  dot: "var(--pc-green-success-normal)",
};

/** Purple / lavender — violet primary tokens */
const THEME_PURPLE: AppointmentCardTheme = {
  bg: "var(--pc-violet-primary-light)",
  border: "var(--pc-violet-primary-light-active)",
  text: "var(--pc-violet-primary-dark)",
  textMuted: "var(--pc-violet-primary-normal)",
  dot: "var(--pc-violet-primary-normal)",
};

/** Orange / peach — amber / open-status tokens */
const THEME_ORANGE: AppointmentCardTheme = {
  bg: "var(--cs-amber-tint)",
  border: "color-mix(in srgb, var(--cs-amber) 35%, white)",
  text: "var(--cs-amber)",
  textMuted: "color-mix(in srgb, var(--cs-amber) 85%, black)",
  dot: "var(--cs-amber)",
};

/** Blue / sky — info semantic (brand-aligned) */
const THEME_BLUE: AppointmentCardTheme = {
  bg: "color-mix(in srgb, var(--info) 12%, white)",
  border: "color-mix(in srgb, var(--info) 35%, white)",
  text: "var(--info)",
  textMuted: "color-mix(in srgb, var(--info) 75%, black)",
  dot: "var(--info)",
};

const THEME_SLATE: AppointmentCardTheme = {
  bg: "var(--pc-grey-tertiary-light)",
  border: "var(--pc-grey-tertiary-light-active)",
  text: "var(--pc-grey-tertiary-dark)",
  textMuted: "var(--pc-grey-tertiary-normal)",
  dot: "var(--pc-black-secondary-light-active)",
};

const THEME_CANCELLED: AppointmentCardTheme = {
  bg: "var(--cs-red-tint)",
  border: "color-mix(in srgb, var(--destructive) 35%, white)",
  text: "var(--destructive)",
  textMuted: "color-mix(in srgb, var(--destructive) 75%, black)",
  dot: "var(--pc-black-secondary-light-active)",
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
    bg: "var(--mobile-status-open-bg)",
    text: "var(--mobile-status-open-fg)",
    textMuted: "color-mix(in srgb, var(--mobile-status-open-fg) 85%, black)",
    extraClass: "opacity-90",
  },
};

/** @deprecated Prefer APPOINTMENT_STATUS_THEMES — kept for filter dots / badges */
export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  PENDING_COMPLETION: {
    bg: "bg-[var(--cs-amber-tint)]",
    border: "border-[color-mix(in_srgb,var(--cs-amber)_35%,white)]",
    text: "text-[var(--cs-amber)]",
    dot: "bg-[var(--cs-amber)]",
  },
  UNCONFIRMED: {
    bg: "bg-[var(--cs-amber-tint)]",
    border: "border-[color-mix(in_srgb,var(--cs-amber)_35%,white)]",
    text: "text-[var(--cs-amber)]",
    dot: "bg-[var(--cs-amber)]",
  },
  CONFIRMED: {
    bg: "bg-[var(--pc-green-success-light)]",
    border: "border-[var(--pc-green-success-light-active)]",
    text: "text-[var(--pc-green-success-dark)]",
    dot: "bg-[var(--pc-green-success-normal)]",
  },
  WAITING: {
    bg: "bg-violet-primary-light",
    border: "border-violet-primary-light-active",
    text: "text-violet-primary-dark",
    dot: "bg-violet-primary-normal",
  },
  IN_SERVICE: {
    bg: "bg-[color-mix(in_srgb,var(--info)_12%,white)]",
    border: "border-[color-mix(in_srgb,var(--info)_35%,white)]",
    text: "text-[var(--info)]",
    dot: "bg-[var(--info)]",
  },
  COMPLETED: {
    bg: "bg-grey-tertiary-light",
    border: "border-grey-tertiary-light-active",
    text: "text-grey-tertiary-dark",
    dot: "bg-black-secondary-light-active",
  },
  CANCELLED: {
    bg: "bg-[var(--cs-red-tint)]",
    border: "border-[color-mix(in_srgb,var(--destructive)_35%,white)]",
    text: "text-destructive",
    dot: "bg-black-secondary-light-active",
  },
  NO_SHOW: {
    bg: "bg-[var(--mobile-status-open-bg)]",
    border: "border-[color-mix(in_srgb,var(--cs-amber)_35%,white)]",
    text: "text-[var(--mobile-status-open-fg)]",
    dot: "bg-[var(--cs-amber)]",
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

/** @deprecated Prefer `<StatusBadge domain="appointment" showDot />`. */
export function getAppointmentStatusBadgeClass(
  status: AppointmentStatus,
): string {
  const colors = APPOINTMENT_STATUS_COLORS[status];
  return `${colors.bg} ${colors.border} ${colors.text}`;
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
