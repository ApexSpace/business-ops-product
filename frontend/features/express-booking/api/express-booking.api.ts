import { getErrorMessage, parseEnvelope } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";

export type ExpressBookingContact = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  companyName: string | null;
};

export type ExpressBookingSummary = {
  token: string;
  expiresAt: string | null;
  businessId: string;
  businessName: string;
  timezone: string;
  startAt: string;
  endAt: string;
  assignedToId: string | null;
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  service: { id: string; name: string } | null;
  guestFirstName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  guestPhoneCountryCode: string | null;
  hasExistingContact: boolean;
  contact: ExpressBookingContact | null;
  formSettings: {
    requireEmail: boolean;
    requirePhone: boolean;
    showNotes: boolean;
    cancellationPolicyText: string | null;
    requirePolicyAgreement: boolean;
  };
  requireCard: boolean;
  requireDeposit: boolean;
  paymentRequired: boolean;
  cardOnly: boolean;
  amountCents: number;
  policyVersion: string;
  allowPhotoUpload: boolean;
  staff: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    available: boolean;
  }>;
};

export type ExpressCheckoutResult = {
  paymentRequired: boolean;
  cardSetupRequired?: boolean;
  holdToken: string | null;
  paymentIntentId?: string | null;
  setupIntentClientSecret?: string | null;
  amountCents: number;
  clientSecret: string | null;
  publishableKey: string | null;
  stripeAccountId: string | null;
};

export type ExpressCompleteResult = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  contactId?: string | null;
  assignedToId?: string | null;
};

export type ExpressCheckoutBody = {
  customerName?: string;
  customerEmail?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  assignedToId?: string;
};

export type ExpressCompleteBody = {
  customerName?: string;
  customerLastName?: string;
  customerEmail?: string;
  companyName?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  notes?: string;
  assignedToId?: string;
  policyAgreed?: boolean;
  reminderOptIn?: boolean;
  paymentIntentId?: string;
  setupIntentId?: string;
  holdToken?: string;
};

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

export function getExpressBooking(token: string) {
  return publicFetch<ExpressBookingSummary>(
    `public/express/${encodeURIComponent(token)}`,
  );
}

export function createExpressCheckout(token: string, body: ExpressCheckoutBody) {
  return publicFetch<ExpressCheckoutResult>(
    `public/express/${encodeURIComponent(token)}/checkout`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export function completeExpressBooking(
  token: string,
  body: ExpressCompleteBody,
) {
  return publicFetch<ExpressCompleteResult>(
    `public/express/${encodeURIComponent(token)}/complete`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}
