import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";
import type {
  PublicBookingBusiness,
  PublicBookingCatalogCategory,
  PublicBookingConfirmation,
  PublicBookingDayAvailability,
  PublicBookingStaff,
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

export function getPublicBookingBusiness(slug: string) {
  return publicFetch<PublicBookingBusiness>(
    `public/booking/businesses/${encodeURIComponent(slug)}`,
  );
}

/** @deprecated */
export const getPublicBookingCalendar = getPublicBookingBusiness;

export function getPublicBookingCatalog(slug: string, staffId?: string) {
  const search = staffId ? `?staffId=${encodeURIComponent(staffId)}` : "";
  return publicFetch<PublicBookingCatalogCategory[]>(
    `public/booking/businesses/${encodeURIComponent(slug)}/catalog${search}`,
  );
}

export function getPublicBookingStaff(
  slug: string,
  serviceId: string,
  genderFilter?: string,
) {
  const search = new URLSearchParams({ serviceId });
  if (genderFilter) search.set("genderFilter", genderFilter);
  return publicFetch<PublicBookingStaff[]>(
    `public/booking/businesses/${encodeURIComponent(slug)}/staff?${search}`,
  );
}

export function getPublicBookingAvailability(
  slug: string,
  params: {
    from: string;
    to: string;
    timezone: string;
    serviceId?: string;
    staffId?: string;
    anyone?: boolean;
    serviceLines?: Array<{ serviceId: string; staffId?: string }>;
  },
) {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    timezone: params.timezone,
  });

  if (params.serviceLines?.length) {
    if (params.serviceLines.length === 1) {
      const line = params.serviceLines[0];
      search.set("serviceId", line.serviceId);
      if (line.staffId) search.set("staffId", line.staffId);
    } else {
      search.set(
        "serviceLines",
        JSON.stringify(
          params.serviceLines.map((line) => ({
            serviceId: line.serviceId,
            ...(line.staffId ? { staffId: line.staffId } : {}),
          })),
        ),
      );
    }
  } else if (params.serviceId) {
    search.set("serviceId", params.serviceId);
    if (params.staffId) search.set("staffId", params.staffId);
    if (params.anyone) search.set("anyone", "true");
  }

  return publicFetch<PublicBookingDayAvailability[]>(
    `public/booking/businesses/${encodeURIComponent(slug)}/availability?${search}`,
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
    offerCode?: string;
    serviceId?: string;
    staffId?: string;
    anyone?: boolean;
    bookedForFirstName?: string;
    bookedForLastName?: string;
    bookedForEmail?: string;
    homeAddress?: string;
    policyAgreed?: boolean;
    reminderOptIn?: boolean;
    formAnswers?: Record<string, unknown>;
    source?: "BOOKING_WIDGET" | "PUBLIC_LINK";
    serviceLines?: Array<{ serviceId: string; staffId?: string }>;
    paymentIntentId?: string;
    holdToken?: string;
  },
) {
  return publicFetch<PublicBookingConfirmation>(
    `public/booking/businesses/${encodeURIComponent(slug)}/appointments`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function joinBookingWaitlist(
  slug: string,
  body: {
    serviceId: string;
    additionalServiceIds?: string[];
    staffId?: string;
    calendarId?: string;
    preferredDate: string;
    customerName: string;
    customerFirstName?: string;
    customerLastName?: string;
    customerEmail?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    preferredMorning?: boolean;
    preferredAfternoon?: boolean;
    preferredEvening?: boolean;
    comments?: string;
  },
) {
  return publicFetch<{ id: string; status: string }>(
    `public/booking/businesses/${encodeURIComponent(slug)}/waitlist`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function createPublicBookingCheckout(
  slug: string,
  body: {
    serviceId: string;
    staffId?: string;
    anyone?: boolean;
    startAt: string;
    endAt: string;
    timezone: string;
    customerName?: string;
    customerEmail?: string;
    phoneCountryCode?: string;
    phoneNumber?: string;
    isEmbed?: boolean;
  },
) {
  return publicFetch<{
    paymentRequired: boolean;
    holdToken: string;
    paymentIntentId: string | null;
    amountCents: number;
    clientSecret: string | null;
    publishableKey: string | null;
    stripeAccountId: string | null;
  }>(`public/booking/businesses/${encodeURIComponent(slug)}/checkout`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createBookingPhotoUpload(
  slug: string,
  body: {
    appointmentId: string;
    uploadToken: string;
    filename: string;
    mimeType: string;
    size: number;
  },
) {
  return publicFetch<{
    fileAssetId: string;
    uploadUrl: string;
    expiresIn: number;
  }>(`public/booking/businesses/${encodeURIComponent(slug)}/uploads`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmBookingPhotoUpload(
  slug: string,
  fileAssetId: string,
  body: { appointmentId: string; uploadToken: string },
) {
  return publicFetch(
    `public/booking/businesses/${encodeURIComponent(slug)}/uploads/${encodeURIComponent(fileAssetId)}/confirm`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function failBookingPhotoUpload(
  slug: string,
  fileAssetId: string,
  body: { appointmentId: string; uploadToken: string; reason?: string },
) {
  return publicFetch(
    `public/booking/businesses/${encodeURIComponent(slug)}/uploads/${encodeURIComponent(fileAssetId)}/fail`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function attachBookingPhotos(
  slug: string,
  body: {
    appointmentId: string;
    uploadToken: string;
    fileIds: string[];
  },
) {
  return publicFetch<{ photoFileIds: string[] }>(
    `public/booking/businesses/${encodeURIComponent(slug)}/photos`,
    { method: "POST", body: JSON.stringify(body) },
  );
}
