import { Prisma } from '@prisma/client';
import {
  isValidBookingSlug,
  slugifyBookingSlug,
} from '@app/modules/operations/public-booking/utils/booking-slug.util';
import {
  buildPublicBookingUrl,
  buildPublicEmbedCode,
  buildPublicEmbedUrl,
} from '@app/modules/operations/public-booking/utils/public-booking-url.util';

/** Slug is always derived from the calendar name (not user-editable). */
export function deriveCalendarPublicSlugFromName(calendarName: string): string | null {
  const fromName = slugifyBookingSlug(calendarName);
  return isValidBookingSlug(fromName) ? fromName : null;
}

export function resolveCalendarPublicSlug(params: {
  publicSlug?: string | null;
  widgetSettings?: unknown;
  calendarName: string;
}): string | null {
  return deriveCalendarPublicSlugFromName(params.calendarName);
}

export function mergeWidgetSettingsWithSlug(
  widgetSettings: unknown,
  slug: string | null,
): Prisma.InputJsonValue | undefined {
  if (!slug) return widgetSettings as Prisma.InputJsonValue | undefined;
  const base =
    widgetSettings && typeof widgetSettings === 'object'
      ? { ...(widgetSettings as Record<string, unknown>) }
      : {};
  return { ...base, bookingSlug: slug } as Prisma.InputJsonValue;
}

export function buildCalendarPublicUrls(
  frontendUrl: string,
  publicSlug: string | null,
  embedEnabled: boolean,
) {
  if (!publicSlug) {
    return {
      publicBookingUrl: null as string | null,
      embedUrl: null as string | null,
      embedCode: null as string | null,
    };
  }
  return {
    publicBookingUrl: buildPublicBookingUrl(frontendUrl, publicSlug),
    embedUrl: embedEnabled
      ? buildPublicEmbedUrl(frontendUrl, publicSlug)
      : null,
    embedCode: embedEnabled
      ? buildPublicEmbedCode(frontendUrl, publicSlug)
      : null,
  };
}
