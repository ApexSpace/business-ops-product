import type {
  CancelRescheduleSettings,
  SelfCancellationMode,
  SelfRescheduleMode,
} from "@/features/cancel-reschedule-settings/api/cancel-reschedule-settings.api";

export const HOURS_BEFORE_OPTIONS = [1, 2, 4, 6, 12, 24, 48, 72] as const;
export type HoursBeforeOption = (typeof HOURS_BEFORE_OPTIONS)[number];

export const SELF_CANCELLATION_OPTIONS = [
  { value: "DISABLED", label: "Don't allow" },
  {
    value: "WITHIN_MINUTES_OF_ONLINE_BOOKING",
    label: "Only within 15 minutes of booking online",
  },
  ...HOURS_BEFORE_OPTIONS.map((hours) => ({
    value: `UNTIL_HOURS_BEFORE:${hours}`,
    label: `Until ${hours} hour${hours === 1 ? "" : "s"} before appointment`,
  })),
] as const;

export const SELF_RESCHEDULE_OPTIONS = [
  { value: "DISABLED", label: "Don't allow" },
  ...HOURS_BEFORE_OPTIONS.map((hours) => ({
    value: `UNTIL_HOURS_BEFORE:${hours}`,
    label: `Until ${hours} hour${hours === 1 ? "" : "s"} before appointment`,
  })),
] as const;

export const LATE_CANCELLATION_OPTIONS = HOURS_BEFORE_OPTIONS.map((hours) => ({
  value: String(hours),
  label: `Within ${hours} hour${hours === 1 ? "" : "s"} of the appointment`,
}));

export function encodeSelfCancellationValue(
  settings: Pick<
    CancelRescheduleSettings,
    "selfCancellationMode" | "selfCancellationHoursBefore"
  >,
): string {
  if (settings.selfCancellationMode === "DISABLED") return "DISABLED";
  if (settings.selfCancellationMode === "WITHIN_MINUTES_OF_ONLINE_BOOKING") {
    return "WITHIN_MINUTES_OF_ONLINE_BOOKING";
  }
  return `UNTIL_HOURS_BEFORE:${settings.selfCancellationHoursBefore}`;
}

export function encodeSelfRescheduleValue(
  settings: Pick<
    CancelRescheduleSettings,
    "selfRescheduleMode" | "selfRescheduleHoursBefore"
  >,
): string {
  if (settings.selfRescheduleMode === "DISABLED") return "DISABLED";
  return `UNTIL_HOURS_BEFORE:${settings.selfRescheduleHoursBefore}`;
}

export function decodeSelfCancellationValue(value: string): {
  selfCancellationMode: SelfCancellationMode;
  selfCancellationHoursBefore?: number;
} {
  if (value === "DISABLED") {
    return { selfCancellationMode: "DISABLED" };
  }
  if (value === "WITHIN_MINUTES_OF_ONLINE_BOOKING") {
    return { selfCancellationMode: "WITHIN_MINUTES_OF_ONLINE_BOOKING" };
  }
  const hours = Number(value.replace("UNTIL_HOURS_BEFORE:", ""));
  return {
    selfCancellationMode: "UNTIL_HOURS_BEFORE_APPOINTMENT",
    selfCancellationHoursBefore: hours,
  };
}

export function decodeSelfRescheduleValue(value: string): {
  selfRescheduleMode: SelfRescheduleMode;
  selfRescheduleHoursBefore?: number;
} {
  if (value === "DISABLED") {
    return { selfRescheduleMode: "DISABLED" };
  }
  const hours = Number(value.replace("UNTIL_HOURS_BEFORE:", ""));
  return {
    selfRescheduleMode: "UNTIL_HOURS_BEFORE_APPOINTMENT",
    selfRescheduleHoursBefore: hours,
  };
}

export function formatSelfCancellationSummary(
  settings: Pick<
    CancelRescheduleSettings,
    | "selfCancellationMode"
    | "selfCancellationMinutes"
    | "selfCancellationHoursBefore"
  >,
): string {
  const value = encodeSelfCancellationValue(settings);
  return (
    SELF_CANCELLATION_OPTIONS.find((option) => option.value === value)?.label ??
    "Don't allow"
  );
}

export function formatSelfRescheduleSummary(
  settings: Pick<
    CancelRescheduleSettings,
    "selfRescheduleMode" | "selfRescheduleHoursBefore"
  >,
): string {
  const value = encodeSelfRescheduleValue(settings);
  return (
    SELF_RESCHEDULE_OPTIONS.find((option) => option.value === value)?.label ??
    "Don't allow"
  );
}

export function formatLateCancellationSummary(hours: number): string {
  return (
    LATE_CANCELLATION_OPTIONS.find((option) => option.value === String(hours))
      ?.label ?? `Within ${hours} hours of the appointment`
  );
}

export function stripHtmlToPlainText(html: string | null | undefined): string {
  if (!html?.trim()) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
