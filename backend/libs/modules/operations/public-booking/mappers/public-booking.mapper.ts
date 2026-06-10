import { Calendar, CalendarLocationType, Business } from '@prisma/client';
import {
  PublicBookingCalendarDto,
  PublicBookingConfirmationDto,
  PublicBookingFormSettingsDto,
} from '../dto/public-booking.dto';

type CalendarWithBusiness = Calendar & {
  business: Pick<Business, 'name' | 'settings'>;
};

function readJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readFormSettings(formSettings: unknown): PublicBookingFormSettingsDto {
  const fs = readJsonRecord(formSettings);
  return {
    requireEmail: Boolean(fs.requireEmail),
    requirePhone: Boolean(fs.requirePhone),
    showNotes: fs.showNotes !== false,
  };
}

function locationSummary(
  locationType: CalendarLocationType,
  locationValue: string | null,
): string | null {
  const value = locationValue?.trim();
  if (!value) return null;
  return value;
}

export function toPublicBookingCalendar(
  calendar: CalendarWithBusiness,
): PublicBookingCalendarDto {
  const ws = readJsonRecord(calendar.widgetSettings);
  const cs = readJsonRecord(calendar.confirmationSettings);
  const businessSettings = readJsonRecord(calendar.business.settings);
  const logoUrl =
    typeof businessSettings.logoUrl === 'string'
      ? businessSettings.logoUrl
      : null;
  const theme = readJsonRecord(ws.theme);
  const brandColor =
    (typeof theme.primaryColor === 'string' && theme.primaryColor.trim()) ||
    calendar.color ||
    null;
  const websiteUrl =
    typeof businessSettings.website === 'string'
      ? businessSettings.website.trim() || null
      : null;

  return {
    slug: calendar.publicSlug!,
    name: calendar.name,
    title: (typeof ws.title === 'string' && ws.title.trim()) || calendar.name,
    description:
      calendar.description ??
      (typeof ws.description === 'string' ? ws.description : null),
    timezone: calendar.timezone,
    durationMinutes: calendar.defaultDurationMinutes,
    businessName: calendar.business.name,
    logoUrl,
    color: calendar.color,
    brandColor,
    websiteUrl,
    locationType: calendar.locationType,
    locationSummary: locationSummary(
      calendar.locationType,
      calendar.locationValue,
    ),
    formSettings: readFormSettings(calendar.formSettings),
    confirmationMessage:
      (typeof cs.successMessage === 'string' && cs.successMessage) ||
      (typeof ws.thankYouMessage === 'string' && ws.thankYouMessage) ||
      'Your appointment is booked!',
    redirectUrl:
      typeof cs.redirectUrl === 'string' ? cs.redirectUrl.trim() || null : null,
    buttonText:
      (typeof ws.buttonText === 'string' && ws.buttonText.trim()) ||
      'Book Appointment',
    embedEnabled: calendar.embedEnabled,
    bookingRules: {
      durationMinutes: calendar.defaultDurationMinutes,
      minimumNoticeMinutes: calendar.minimumNoticeMinutes,
      maxBookingDays: calendar.maxBookingDays,
      bufferBeforeMinutes: calendar.bufferBeforeMinutes,
      bufferAfterMinutes: calendar.bufferAfterMinutes,
    },
  };
}

export function toPublicBookingConfirmation(params: {
  appointmentId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  status: string;
  calendar: Calendar;
  businessName: string;
}): PublicBookingConfirmationDto {
  const cs = readJsonRecord(params.calendar.confirmationSettings);
  const ws = readJsonRecord(params.calendar.widgetSettings);

  return {
    appointmentId: params.appointmentId,
    title: params.title,
    startAt: params.startAt.toISOString(),
    endAt: params.endAt.toISOString(),
    timezone: params.timezone,
    status: params.status,
    calendarName: params.calendar.name,
    businessName: params.businessName,
    confirmationMessage:
      (typeof cs.successMessage === 'string' && cs.successMessage) ||
      (typeof ws.thankYouMessage === 'string' && ws.thankYouMessage) ||
      'Your appointment is booked!',
    redirectUrl:
      typeof cs.redirectUrl === 'string' ? cs.redirectUrl.trim() || null : null,
    locationSummary: locationSummary(
      params.calendar.locationType,
      params.calendar.locationValue,
    ),
  };
}
