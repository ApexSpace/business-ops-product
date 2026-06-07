import { toast } from "sonner";
import {
  slugifyCalendarName,
  type Calendar,
} from "@/features/calendars/schemas/calendar-profile";
import {
  buildEmbedCode,
  resolvePublicBookingUrl,
  resolvePublicEmbedUrl,
} from "@/features/public-booking/utils/booking-url";

export function getCalendarPublicBookingLabel(calendar: Calendar): string {
  return canUsePublicBooking(calendar) ? "Active" : "Not active";
}

export function canUsePublicBooking(calendar: Calendar): boolean {
  return (
    calendar.status === "ACTIVE" &&
    calendar.publicBookingEnabled &&
    Boolean(getEffectiveBookingSlug(calendar))
  );
}

export function getEffectiveBookingSlug(calendar: Calendar): string {
  const fromName = slugifyCalendarName(calendar.name);
  if (fromName) return fromName;
  if (calendar.publicSlug?.trim()) return calendar.publicSlug.trim();
  const ws = calendar.widgetSettings as { bookingSlug?: string } | null;
  return ws?.bookingSlug?.trim() ?? "";
}

export function resolveBookingPageUrl(calendar: Calendar): string | null {
  if (calendar.publicBookingUrl) return calendar.publicBookingUrl;
  const slug = getEffectiveBookingSlug(calendar);
  return slug ? resolvePublicBookingUrl(slug) : null;
}

export function resolveEmbedCodeForCalendar(calendar: Calendar): string | null {
  if (calendar.embedCode) return calendar.embedCode;
  const slug = getEffectiveBookingSlug(calendar);
  if (!slug || !calendar.embedEnabled) return null;
  return buildEmbedCode(slug);
}

export async function copyBookingLink(calendar: Calendar): Promise<boolean> {
  if (!canUsePublicBooking(calendar)) {
    toast.error("Public booking is disabled. Enable it first.");
    return false;
  }
  const url = resolveBookingPageUrl(calendar);
  if (!url) {
    toast.error("Set up a booking link slug before copying.");
    return false;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Booking link copied");
    return true;
  } catch {
    toast.error("Could not copy to clipboard");
    return false;
  }
}

export async function copyEmbedCode(calendar: Calendar): Promise<boolean> {
  if (!canUsePublicBooking(calendar)) {
    toast.error("Public booking is disabled. Enable it first.");
    return false;
  }
  if (!calendar.embedEnabled) {
    toast.error("Website embed is disabled for this calendar.");
    return false;
  }
  const code = resolveEmbedCodeForCalendar(calendar);
  if (!code) {
    toast.error("Embed code is not available yet. Save the calendar first.");
    return false;
  }
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Embed code copied");
    return true;
  } catch {
    toast.error("Could not copy to clipboard");
    return false;
  }
}

export function openBookingPage(calendar: Calendar): void {
  if (!canUsePublicBooking(calendar)) {
    toast.error("Public booking is disabled. Enable it first.");
    return;
  }
  const url = resolveBookingPageUrl(calendar);
  if (!url) {
    toast.error("Booking page is not ready. Check your booking link settings.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  toast.success("Booking page opened");
}

export function previewEmbed(calendar: Calendar): void {
  if (!canUsePublicBooking(calendar)) {
    toast.error("Public booking is disabled. Enable it first.");
    return;
  }
  const slug = getEffectiveBookingSlug(calendar);
  if (!slug) return;
  window.open(resolvePublicEmbedUrl(slug), "_blank", "noopener,noreferrer");
}
