export interface PublicBookingFormSettings {
  requireEmail: boolean;
  requirePhone: boolean;
  showNotes: boolean;
}

export interface PublicBookingRulesSummary {
  durationMinutes: number;
  minimumNoticeMinutes: number;
  maxBookingDays: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface PublicBookingCalendar {
  slug: string;
  name: string;
  title: string;
  description: string | null;
  timezone: string;
  durationMinutes: number;
  businessName: string;
  logoUrl: string | null;
  color: string | null;
  brandColor: string | null;
  websiteUrl: string | null;
  locationType: string;
  locationSummary: string | null;
  formSettings: PublicBookingFormSettings;
  confirmationMessage: string;
  redirectUrl: string | null;
  buttonText: string;
  embedEnabled: boolean;
  bookingRules: PublicBookingRulesSummary;
}

export interface PublicBookingSlot {
  startAt: string;
  endAt: string;
  label: string;
  available: boolean;
}

export interface PublicBookingDayAvailability {
  date: string;
  slots: PublicBookingSlot[];
}

export interface PublicBookingConfirmation {
  appointmentId: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: string;
  calendarName: string;
  businessName: string;
  confirmationMessage: string;
  redirectUrl: string | null;
  locationSummary: string | null;
}
