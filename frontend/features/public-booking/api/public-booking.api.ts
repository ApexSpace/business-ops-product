import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";
import type {
  PublicBookingCalendar,
  PublicBookingConfirmation,
  PublicBookingDayAvailability,
} from "@/features/public-booking/schemas/public-booking";

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`/api/backend/${normalized}`, window.location.origin);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(
      getErrorMessage(body, "Request failed"),
      res.status,
      body?.error ?? body,
    );
  }

  return parseEnvelope<T>(body).data;
}

export function getPublicBookingCalendar(slug: string) {
  return publicFetch<PublicBookingCalendar>(
    `public/booking/calendars/${encodeURIComponent(slug)}`,
  );
}

export function getPublicBookingAvailability(
  slug: string,
  params: {
    from: string;
    to: string;
    timezone: string;
    staffId?: string;
  },
) {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    timezone: params.timezone,
  });
  if (params.staffId) search.set("staffId", params.staffId);

  return publicFetch<PublicBookingDayAvailability[]>(
    `public/booking/calendars/${encodeURIComponent(slug)}/availability?${search}`,
  );
}

export function createPublicBooking(
  slug: string,
  body: {
    startAt: string;
    endAt: string;
    timezone: string;
    customerName: string;
    customerEmail?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    notes?: string;
    formAnswers?: Record<string, unknown>;
    source?: "BOOKING_WIDGET" | "PUBLIC_LINK";
    staffId?: string;
    serviceId?: string;
  },
) {
  return publicFetch<PublicBookingConfirmation>(
    `public/booking/calendars/${encodeURIComponent(slug)}/appointments`,
    { method: "POST", body: JSON.stringify(body) },
  );
}
