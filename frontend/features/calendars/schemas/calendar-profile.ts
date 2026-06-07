import { z } from "zod";
import { normalizeTimezone } from "@/features/calendars/utils/timezone";

export type CalendarStatus = "ACTIVE" | "INACTIVE";
export type CalendarType =
  | "SERVICE"
  | "STAFF"
  | "ROUND_ROBIN"
  | "COLLECTIVE"
  | "CLASS_EVENT"
  | "PERSONAL";
export type CalendarLocationType =
  | "PHYSICAL"
  | "PHONE_CALL"
  | "GOOGLE_MEET"
  | "ZOOM"
  | "CUSTOM"
  | "ONSITE";
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type GoogleSyncDirection =
  | "NONE"
  | "INTERNAL_TO_GOOGLE"
  | "GOOGLE_TO_INTERNAL"
  | "TWO_WAY";

export interface Calendar {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  type: CalendarType;
  color: string | null;
  timezone: string;
  status: CalendarStatus;
  defaultDurationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minimumNoticeMinutes: number;
  maxBookingDays: number;
  slotIntervalMinutes: number;
  locationType: CalendarLocationType;
  locationValue: string | null;
  requireApproval: boolean;
  autoConfirm: boolean;
  capacity: number;
  formSettings: Record<string, unknown> | null;
  confirmationSettings: Record<string, unknown> | null;
  paymentSettings: Record<string, unknown> | null;
  notificationSettings: Record<string, unknown> | null;
  policySettings: Record<string, unknown> | null;
  widgetSettings: Record<string, unknown> | null;
  googleSyncSettings: Record<string, unknown> | null;
  publicSlug: string | null;
  publicBookingEnabled: boolean;
  embedEnabled: boolean;
  publicBookingUrl?: string | null;
  embedUrl?: string | null;
  embedCode?: string | null;
  staffCount?: number;
  appointmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDetail extends Calendar {
  staff: CalendarStaff[];
  availability: CalendarAvailability[];
  exceptions: CalendarException[];
}

export interface CalendarStaff {
  id: string;
  calendarId: string;
  userId: string;
  role: string | null;
  isPrimary: boolean;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface CalendarAvailability {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface CalendarException {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isUnavailable: boolean;
  reason: string | null;
}

export const CALENDAR_TYPE_OPTIONS: { value: CalendarType; label: string }[] = [
  { value: "PERSONAL", label: "Personal booking" },
  { value: "ROUND_ROBIN", label: "Round robin" },
  { value: "CLASS_EVENT", label: "Class booking" },
  { value: "COLLECTIVE", label: "Collective booking" },
  { value: "SERVICE", label: "Service (legacy)" },
  { value: "STAFF", label: "Staff (legacy)" },
];

/** User-facing calendar types shown in the creation wizard (Step 1). */
export type CalendarCreationTypeId =
  | "personal"
  | "round_robin"
  | "class"
  | "collective"
  | "internal";

export interface CalendarCreationTypeOption {
  id: CalendarCreationTypeId;
  title: string;
  description: string;
  examples: string[];
  backendType: CalendarType;
  defaultCapacity: number;
  showPrimaryStaff: boolean;
}

export const CALENDAR_CREATION_TYPES: CalendarCreationTypeOption[] = [
  {
    id: "personal",
    title: "One-on-One",
    description: "One staff member meets one customer.",
    examples: [
      "Dental consultation",
      "Legal consultation",
      "Botox consultation",
    ],
    backendType: "PERSONAL",
    defaultCapacity: 1,
    showPrimaryStaff: true,
  },
  {
    id: "round_robin",
    title: "Team / Round Robin",
    description: "Appointments are distributed among multiple staff members.",
    examples: ["Sales calls", "Intake consultations"],
    backendType: "ROUND_ROBIN",
    defaultCapacity: 1,
    showPrimaryStaff: true,
  },
  {
    id: "class",
    title: "Group / Class",
    description: "One host serves multiple participants.",
    examples: ["Training classes", "Workshops", "Group sessions"],
    backendType: "CLASS_EVENT",
    defaultCapacity: 10,
    showPrimaryStaff: true,
  },
  {
    id: "collective",
    title: "Collective",
    description: "Multiple staff attend one appointment.",
    examples: ["Panel consultations", "Team meetings"],
    backendType: "COLLECTIVE",
    defaultCapacity: 1,
    showPrimaryStaff: true,
  },
  {
    id: "internal",
    title: "Internal Calendar",
    description: "Staff-only scheduling without a public booking page.",
    examples: ["Internal meetings", "Team blocks", "Ops scheduling"],
    backendType: "STAFF",
    defaultCapacity: 1,
    showPrimaryStaff: true,
  },
];

export const DURATION_PRESETS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
  { value: 120, label: "120 min" },
] as const;

/** Simplified edit navigation (5 tabs). */
export const CALENDAR_EDIT_SECTIONS = [
  { id: "general", label: "General" },
  { id: "availability", label: "Availability" },
  { id: "booking-page", label: "Booking Page" },
  { id: "integrations", label: "Integrations" },
  { id: "advanced", label: "Advanced" },
] as const;

/** Business-friendly booking type labels for list & details. */
export function getBookingTypeLabel(type: CalendarType): string {
  switch (type) {
    case "PERSONAL":
      return "One-on-One";
    case "ROUND_ROBIN":
      return "Round Robin";
    case "CLASS_EVENT":
      return "Class / Group";
    case "COLLECTIVE":
      return "Collective";
    case "SERVICE":
    case "STAFF":
      return "Internal";
    default:
      return type;
  }
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} hr ${m} min`;
}

export function summarizeWeeklyAvailability(
  slots: Array<{ dayOfWeek: DayOfWeek; isEnabled: boolean; startTime: string; endTime: string }>,
): string {
  const enabled = slots.filter((s) => s.isEnabled);
  if (enabled.length === 0) return "No hours set";
  const first = enabled[0]!;
  const sameHours = enabled.every(
    (s) => s.startTime === first.startTime && s.endTime === first.endTime,
  );
  const weekdays = enabled.filter((s) =>
    ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].includes(s.dayOfWeek),
  );
  if (
    sameHours &&
    weekdays.length === 5 &&
    enabled.length === 5
  ) {
    return `Mon–Fri ${formatTime12(first.startTime)}–${formatTime12(first.endTime)}`;
  }
  return `${enabled.length} day${enabled.length === 1 ? "" : "s"} configured`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = (h ?? 0) >= 12 ? "PM" : "AM";
  const hour12 = (h ?? 0) % 12 || 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export type CalendarEditSectionId =
  (typeof CALENDAR_EDIT_SECTIONS)[number]["id"];

export const quickSetupSchema = z.object({
  name: z.string().min(1, "Calendar name is required").max(255),
  description: z.string().max(2000).optional(),
  primaryStaffUserId: z.string().optional(),
  defaultDurationMinutes: z.number().min(5).max(480),
});

export type QuickSetupValues = z.infer<typeof quickSetupSchema>;

export function slugifyCalendarName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function getBookingSlugFromCalendar(calendar: Calendar): string {
  return slugifyCalendarName(calendar.name);
}

export function quickSetupToFormValues(
  type: CalendarCreationTypeOption,
  values: QuickSetupValues,
  businessTimezone?: string | null,
): CalendarFormValues {
  const slug = slugifyCalendarName(values.name);
  return {
    ...calendarFormDefaults,
    timezone: normalizeTimezone(businessTimezone),
    name: values.name.trim(),
    description: values.description?.trim() ?? "",
    type: type.backendType,
    defaultDurationMinutes: values.defaultDurationMinutes,
    capacity: type.defaultCapacity,
    widgetSettings: {
      ...calendarFormDefaults.widgetSettings,
      bookingSlug: slug,
      title: values.name.trim(),
    },
    confirmationSettings: {
      ...calendarFormDefaults.confirmationSettings,
      meetingInviteTitle: values.name.trim(),
    },
  };
}

export const LOCATION_TYPE_OPTIONS: { value: CalendarLocationType; label: string }[] = [
  { value: "PHYSICAL", label: "Physical address" },
  { value: "PHONE_CALL", label: "Phone call" },
  { value: "GOOGLE_MEET", label: "Google Meet" },
  { value: "ZOOM", label: "Zoom" },
  { value: "ONSITE", label: "On-site visit" },
  { value: "CUSTOM", label: "Custom" },
];

export type AppointmentLocationMode = "calendar_default" | "custom";

export function formatCalendarMeetingLocation(
  calendar: Pick<Calendar, "locationType" | "locationValue">,
): string {
  const typeLabel =
    LOCATION_TYPE_OPTIONS.find((o) => o.value === calendar.locationType)
      ?.label ?? calendar.locationType;
  const value = calendar.locationValue?.trim();
  return value ? `${typeLabel} — ${value}` : typeLabel;
}

export function resolveAppointmentLocationMode(
  appointment: {
    locationType: CalendarLocationType | null;
    locationValue: string | null;
  },
  calendar: Pick<Calendar, "locationType" | "locationValue">,
): AppointmentLocationMode {
  const aptType = appointment.locationType;
  const aptValue = (appointment.locationValue ?? "").trim();
  const calValue = (calendar.locationValue ?? "").trim();

  if (!aptType && !aptValue) return "calendar_default";
  if (aptType === calendar.locationType && aptValue === calValue) {
    return "calendar_default";
  }
  return "custom";
}

export function getLocationValuePlaceholder(
  locationType: CalendarLocationType,
): string {
  switch (locationType) {
    case "PHONE_CALL":
      return "Phone number";
    case "GOOGLE_MEET":
    case "ZOOM":
      return "Meeting link (optional)";
    case "PHYSICAL":
    case "ONSITE":
      return "Address or instructions";
    default:
      return "Address, link, or instructions";
  }
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const SYNC_DIRECTION_OPTIONS: { value: GoogleSyncDirection; label: string }[] = [
  { value: "NONE", label: "No sync" },
  { value: "INTERNAL_TO_GOOGLE", label: "Internal → Google" },
  { value: "GOOGLE_TO_INTERNAL", label: "Google → Internal" },
  { value: "TWO_WAY", label: "Two-way" },
];

const jsonObject = z.record(z.string(), z.unknown()).optional();

export const calendarFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  type: z.enum([
    "SERVICE",
    "STAFF",
    "ROUND_ROBIN",
    "COLLECTIVE",
    "CLASS_EVENT",
    "PERSONAL",
  ]),
  color: z.string().max(20).optional(),
  timezone: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  defaultDurationMinutes: z.number().min(5).max(480),
  bufferBeforeMinutes: z.number().min(0).max(120),
  bufferAfterMinutes: z.number().min(0).max(120),
  minimumNoticeMinutes: z.number().min(0),
  maxBookingDays: z.number().min(1).max(365),
  slotIntervalMinutes: z.number().min(5).max(120),
  locationType: z.enum([
    "PHYSICAL",
    "PHONE_CALL",
    "GOOGLE_MEET",
    "ZOOM",
    "CUSTOM",
    "ONSITE",
  ]),
  locationValue: z.string().max(500).optional(),
  requireApproval: z.boolean(),
  autoConfirm: z.boolean(),
  capacity: z.number().min(1).max(100),
  formSettings: jsonObject,
  confirmationSettings: jsonObject,
  paymentSettings: jsonObject,
  notificationSettings: jsonObject,
  policySettings: jsonObject,
  widgetSettings: jsonObject,
  publicSlug: z.string().max(80).optional(),
  publicBookingEnabled: z.boolean(),
  embedEnabled: z.boolean(),
  googleSyncEnabled: z.boolean(),
  googleSyncDirection: z.enum([
    "NONE",
    "INTERNAL_TO_GOOGLE",
    "GOOGLE_TO_INTERNAL",
    "TWO_WAY",
  ]),
  googleIntegrationResourceId: z.string().optional(),
});

export type CalendarFormValues = z.infer<typeof calendarFormSchema>;

export const calendarFormDefaults: CalendarFormValues = {
  name: "",
  description: "",
  type: "SERVICE",
  color: "#3b82f6",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  status: "ACTIVE",
  defaultDurationMinutes: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minimumNoticeMinutes: 60,
  maxBookingDays: 60,
  slotIntervalMinutes: 15,
  locationType: "PHYSICAL",
  locationValue: "",
  requireApproval: false,
  autoConfirm: true,
  capacity: 1,
  formSettings: {},
  confirmationSettings: { successMessage: "Your appointment is booked!" },
  paymentSettings: { requirePayment: false, requireDeposit: false },
  notificationSettings: {},
  policySettings: {},
  widgetSettings: { title: "Book an appointment", buttonText: "Book now" },
  publicSlug: "",
  publicBookingEnabled: false,
  embedEnabled: true,
  googleSyncEnabled: false,
  googleSyncDirection: "NONE",
  googleIntegrationResourceId: "",
};

export function getCreationTypeLabel(type: CalendarType): string {
  const match = CALENDAR_CREATION_TYPES.find((t) => t.backendType === type);
  if (match) return match.title;
  return CALENDAR_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function calendarToForm(calendar: CalendarDetail): CalendarFormValues {
  const gs = calendar.googleSyncSettings ?? {};
  const ws = (calendar.widgetSettings as Record<string, unknown>) ?? {};
  const cs = (calendar.confirmationSettings as Record<string, unknown>) ?? {};
  return {
    name: calendar.name,
    description: calendar.description ?? "",
    type: calendar.type,
    color: calendar.color ?? "#3b82f6",
    timezone: calendar.timezone,
    status: calendar.status,
    defaultDurationMinutes: calendar.defaultDurationMinutes,
    bufferBeforeMinutes: calendar.bufferBeforeMinutes,
    bufferAfterMinutes: calendar.bufferAfterMinutes,
    minimumNoticeMinutes: calendar.minimumNoticeMinutes,
    maxBookingDays: calendar.maxBookingDays,
    slotIntervalMinutes: calendar.slotIntervalMinutes,
    locationType: calendar.locationType,
    locationValue: calendar.locationValue ?? "",
    requireApproval: calendar.requireApproval,
    autoConfirm: calendar.autoConfirm,
    capacity: calendar.capacity,
    formSettings: (calendar.formSettings as Record<string, unknown>) ?? {},
    confirmationSettings: {
      ...cs,
      meetingInviteTitle:
        (cs.meetingInviteTitle as string) ?? calendar.name,
    },
    paymentSettings: (calendar.paymentSettings as Record<string, unknown>) ?? {},
    notificationSettings:
      (calendar.notificationSettings as Record<string, unknown>) ?? {},
    policySettings: (calendar.policySettings as Record<string, unknown>) ?? {},
    widgetSettings: {
      ...ws,
      bookingSlug: slugifyCalendarName(calendar.name),
    },
    publicSlug: slugifyCalendarName(calendar.name),
    publicBookingEnabled: calendar.publicBookingEnabled,
    embedEnabled: calendar.embedEnabled,
    googleSyncEnabled: Boolean(gs.enabled),
    googleSyncDirection:
      (gs.syncDirection as GoogleSyncDirection) ?? "NONE",
    googleIntegrationResourceId:
      (gs.integrationResourceId as string) ?? "",
  };
}

export function calendarFormToApiBody(values: CalendarFormValues) {
  const slug = slugifyCalendarName(values.name.trim());
  const widgetSettings = {
    ...(values.widgetSettings ?? {}),
    ...(values.publicBookingEnabled ? { bookingSlug: slug } : {}),
  };

  return {
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    type: values.type,
    color: values.color?.trim() || undefined,
    timezone: values.timezone,
    status: values.status,
    defaultDurationMinutes: values.defaultDurationMinutes,
    bufferBeforeMinutes: values.bufferBeforeMinutes,
    bufferAfterMinutes: values.bufferAfterMinutes,
    minimumNoticeMinutes: values.minimumNoticeMinutes,
    maxBookingDays: values.maxBookingDays,
    slotIntervalMinutes: values.slotIntervalMinutes,
    locationType: values.locationType,
    locationValue: values.locationValue?.trim() || undefined,
    requireApproval: values.requireApproval,
    autoConfirm: values.autoConfirm,
    capacity: values.capacity,
    formSettings: values.formSettings,
    confirmationSettings: values.confirmationSettings,
    paymentSettings: values.paymentSettings,
    notificationSettings: values.notificationSettings,
    policySettings: values.policySettings,
    widgetSettings,
    publicSlug: values.publicBookingEnabled ? slug : undefined,
    publicBookingEnabled: values.publicBookingEnabled,
    embedEnabled: values.embedEnabled,
    googleSyncSettings: {
      enabled: values.googleSyncEnabled,
      syncDirection: values.googleSyncDirection,
      integrationResourceId:
        values.googleIntegrationResourceId?.trim() || null,
    },
  };
}

export function defaultWeeklyAvailability() {
  return DAYS_OF_WEEK.map((day) => ({
    dayOfWeek: day,
    startTime: "09:00",
    endTime: "17:00",
    isEnabled: !["SATURDAY", "SUNDAY"].includes(day),
  }));
}

export function getGoogleSyncLabel(calendar: Calendar): string {
  const gs = calendar.googleSyncSettings;
  if (!gs?.enabled) return "Not synced";
  const dir = gs.syncDirection as string | undefined;
  if (!dir || dir === "NONE") return "Configured";
  return SYNC_DIRECTION_OPTIONS.find((o) => o.value === dir)?.label ?? dir;
}
