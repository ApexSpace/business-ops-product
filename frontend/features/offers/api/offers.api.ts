import { api } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/api/envelope";
import { ApiClientError } from "@/lib/api/errors";
import type {
  CreateOfferDiscountInput,
  CreateOfferInput,
  Offer,
  OfferUsageReport,
  UpdateOfferDetailsInput,
} from "@/features/offers/types";

async function publicOffersFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
  return (body?.data ?? body) as T;
}

export function listOffers(search?: string) {
  return api.get<Offer[]>("offers", {
    searchParams: search ? { search } : undefined,
  });
}

export function getOffer(id: string) {
  return api.get<Offer>(`offers/${id}`);
}

export function createOffer(body: CreateOfferInput) {
  return api.post<Offer>("offers", body);
}

export function updateOfferDetails(id: string, body: UpdateOfferDetailsInput) {
  return api.patch<Offer>(`offers/${id}/details`, body);
}

export function enableOffer(id: string) {
  return api.post<Offer>(`offers/${id}/enable`);
}

export function disableOffer(id: string) {
  return api.post<Offer>(`offers/${id}/disable`);
}

export function duplicateOffer(id: string) {
  return api.post<Offer>(`offers/${id}/duplicate`);
}

export function deleteOffer(id: string) {
  return api.delete<void>(`offers/${id}`, { searchParams: { confirm: true } });
}

export function reorderOffers(ids: string[]) {
  return api.post<void>("offers/reorder", { ids });
}

export function addOfferDiscount(id: string, body: CreateOfferDiscountInput) {
  return api.post<Offer>(`offers/${id}/discounts`, body);
}

export function updateOfferDiscount(
  offerId: string,
  discountId: string,
  body: CreateOfferDiscountInput,
) {
  return api.patch<Offer>(
    `offers/${offerId}/discounts/${discountId}`,
    body,
  );
}

export function deleteOfferDiscount(offerId: string, discountId: string) {
  return api.delete<Offer>(`offers/${offerId}/discounts/${discountId}`);
}

export function getOfferUsageReport(filters: {
  offerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return api.get<OfferUsageReport>("offers/usage-report", {
    searchParams: filters,
  });
}

export function validatePublicOfferCode(slug: string, code: string) {
  return publicOffersFetch<Offer>(
    `public/offers/${encodeURIComponent(slug)}/validate-code`,
    { method: "POST", body: JSON.stringify({ code }) },
  );
}

export function publicHasOfferCodes(slug: string) {
  return publicOffersFetch<{ hasOfferCodes: boolean }>(
    `public/offers/${encodeURIComponent(slug)}/has-offer-codes`,
  );
}

export function listStaffOffersForCheckout() {
  return api.get<Array<{ id: string; name: string; description?: string | null }>>(
    "checkouts/picker/offers",
  );
}

export function applyCheckoutOffer(checkoutId: string, offerId: string) {
  return api.post<import("@/features/sales/types/checkout").Checkout>(
    `checkouts/${checkoutId}/apply-offer`,
    { offerId },
  );
}

export function removeCheckoutOffer(checkoutId: string, offerId: string) {
  return api.post<import("@/features/sales/types/checkout").Checkout>(
    `checkouts/${checkoutId}/remove-offer`,
    { offerId },
  );
}
