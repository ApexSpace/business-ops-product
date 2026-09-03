import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";
import type { PublicBookingDayAvailability } from "@/features/public-booking/schemas/public-booking";

export interface PublicAppointmentManageSummary {
  businessName: string;
  businessPhone: string | null;
  timezone: string;
  title: string;
  serviceName: string | null;
  staffName: string | null;
  startAt: string;
  endAt: string;
  status: string;
  canCancel: boolean;
  canReschedule: boolean;
  cancellationPolicyHtml: string | null;
  cancellationPolicySms: string | null;
}

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

export function getPublicAppointmentManage(token: string) {
  return publicFetch<PublicAppointmentManageSummary>(
    `public/appointments/${encodeURIComponent(token)}`,
  );
}

export function cancelPublicAppointment(token: string) {
  return publicFetch<{ success: true }>(
    `public/appointments/${encodeURIComponent(token)}/cancel`,
    { method: "POST", body: "{}" },
  );
}

export function getPublicAppointmentAvailability(
  token: string,
  params: { from: string; to: string; timezone?: string },
) {
  const search = new URLSearchParams({
    from: params.from,
    to: params.to,
    ...(params.timezone ? { timezone: params.timezone } : {}),
  });
  return publicFetch<PublicBookingDayAvailability[]>(
    `public/appointments/${encodeURIComponent(token)}/availability?${search.toString()}`,
  );
}

export function reschedulePublicAppointment(
  token: string,
  body: { startAt: string; endAt: string },
) {
  return publicFetch<{ success: true; startAt: string; endAt: string }>(
    `public/appointments/${encodeURIComponent(token)}/reschedule`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}
