import { CalendarLocationType } from '@prisma/client';
import type { BusinessBookingContext } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import { resolveBookingTimezone } from '@app/modules/operations/online-booking-settings/utils/resolve-booking-timezone.util';
import {
  PublicBookingBusinessDto,
  PublicBookingConfirmationDto,
  PublicBookingFormSettingsDto,
} from '../dto/public-booking.dto';

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
    showBookForSomeoneElse: fs.showBookForSomeoneElse !== false,
    cancellationPolicyText:
      typeof fs.cancellationPolicyText === 'string'
        ? fs.cancellationPolicyText
        : null,
    requirePolicyAgreement: Boolean(fs.requirePolicyAgreement),
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

export function toPublicBookingBusiness(
  context: BusinessBookingContext,
  extras?: { giftCardUrl?: string | null; packageUrl?: string | null },
): PublicBookingBusinessDto {
  const ws = readJsonRecord(context.widgetSettings);
  const cs = readJsonRecord(context.confirmationSettings);
  const businessSettings = readJsonRecord(context.business.settings);
  const logoUrl =
    typeof businessSettings.logoUrl === 'string'
      ? businessSettings.logoUrl
      : null;
  const theme = readJsonRecord(ws.theme);
  const brandColor =
    (typeof theme.primaryColor === 'string' && theme.primaryColor.trim()) ||
    null;
  const websiteUrl =
    typeof businessSettings.website === 'string'
      ? businessSettings.website.trim() || null
      : context.business.name
        ? null
        : null;

  return {
    slug: context.publicSlug!,
    businessName: context.business.name,
    title:
      (typeof ws.title === 'string' && ws.title.trim()) ||
      context.business.name,
    description: (typeof ws.description === 'string' && ws.description) || null,
    timezone: resolveBookingTimezone(
      context.timezone,
      context.business.timezone,
    ),
    logoUrl,
    brandColor,
    websiteUrl:
      (websiteUrl ??
        (typeof context.business.settings === 'object' &&
        context.business.settings &&
        'website' in (context.business.settings as object)
          ? String(
              (context.business.settings as { website?: string }).website ?? '',
            )
          : null)) ||
      null,
    locationType: context.locationType,
    locationSummary: locationSummary(
      context.locationType,
      context.locationValue,
    ),
    formSettings: readFormSettings(context.formSettings),
    confirmationMessage:
      (typeof cs.successMessage === 'string' && cs.successMessage) ||
      (typeof ws.thankYouMessage === 'string' && ws.thankYouMessage) ||
      'Your appointment is booked!',
    redirectUrl:
      typeof cs.redirectUrl === 'string' ? cs.redirectUrl.trim() || null : null,
    buttonText:
      (typeof ws.buttonText === 'string' && ws.buttonText.trim()) ||
      'Book Appointment',
    embedEnabled: context.embedEnabled,
    bookingRules: {
      minimumNoticeMinutes: context.minimumNoticeMinutes,
      maxBookingDays: context.maxBookingDays,
      allowMultipleServices: context.allowMultipleServices,
      allowDuplicateServices: context.allowDuplicateServices,
      singleStaffOnly: context.singleStaffOnly,
      waitlistEnabled: context.waitlistEnabled,
    },
    giftCardUrl: extras?.giftCardUrl ?? null,
    packageUrl: extras?.packageUrl ?? null,
  };
}

/** @deprecated */
export function toPublicBookingCalendar(
  context: BusinessBookingContext,
): PublicBookingBusinessDto & {
  name: string;
  durationMinutes: number;
  color: string | null;
} {
  const base = toPublicBookingBusiness(context);
  return {
    ...base,
    name: base.businessName,
    durationMinutes: 30,
    color: base.brandColor,
  };
}

export function toPublicBookingConfirmation(params: {
  appointmentId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  status: string;
  businessName: string;
  serviceName?: string | null;
  staffName?: string | null;
  serviceLines?: Array<{
    serviceId: string;
    serviceName: string;
    staffId: string | null;
    staffName: string | null;
    startAt: Date;
    endAt: Date;
    price: string | null;
  }>;
  context: BusinessBookingContext;
  uploadToken?: string | null;
}): PublicBookingConfirmationDto {
  const cs = readJsonRecord(params.context.confirmationSettings);
  const ws = readJsonRecord(params.context.widgetSettings);

  return {
    appointmentId: params.appointmentId,
    title: params.title,
    startAt: params.startAt.toISOString(),
    endAt: params.endAt.toISOString(),
    timezone: params.timezone,
    status: params.status,
    businessName: params.businessName,
    serviceName: params.serviceName ?? null,
    staffName: params.staffName ?? null,
    serviceLines: (params.serviceLines ?? []).map((line) => ({
      serviceId: line.serviceId,
      serviceName: line.serviceName,
      staffId: line.staffId,
      staffName: line.staffName,
      startAt: line.startAt.toISOString(),
      endAt: line.endAt.toISOString(),
      price: line.price,
    })),
    confirmationMessage:
      (typeof cs.successMessage === 'string' && cs.successMessage) ||
      (typeof ws.thankYouMessage === 'string' && ws.thankYouMessage) ||
      'Your appointment is booked!',
    redirectUrl:
      typeof cs.redirectUrl === 'string' ? cs.redirectUrl.trim() || null : null,
    locationSummary: locationSummary(
      params.context.locationType,
      params.context.locationValue,
    ),
    collectPhotosEnabled: params.context.collectPhotosEnabled,
    photoUploadPrompt: params.context.photoUploadPrompt,
    uploadToken: params.uploadToken ?? null,
  };
}
