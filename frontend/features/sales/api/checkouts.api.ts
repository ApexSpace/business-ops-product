import { api } from "@/lib/api/client";
import type {
  Checkout,
  CheckoutProductPickerItem,
  CheckoutServicePickerItem,
  CloseCheckoutResult,
} from "@/features/sales/types/checkout";
import type { CollectPaymentTender } from "@/features/payments/api/payment-collection.api";

export interface ListCheckoutsFilters {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  status?: string;
  issueFrom?: string;
  issueTo?: string;
}

export interface CheckoutStaffPickerItem {
  id: string;
  label: string;
}

export function listCheckouts(filters: ListCheckoutsFilters = {}) {
  return api.getPaginated<Checkout>("checkouts", { searchParams: filters });
}

export function getCheckout(id: string) {
  return api.get<Checkout>(`checkouts/${id}`);
}

export function createCheckout(body: {
  contactId: string;
  notes?: string;
}) {
  return api.post<Checkout>("checkouts", body);
}

export function addCheckoutService(
  checkoutId: string,
  body: {
    serviceId: string;
    staffUserId?: string;
    quantity?: number;
    clientMembershipId?: string;
    membershipServiceGroupId?: string;
  },
) {
  return api.post<Checkout>(`checkouts/${checkoutId}/items/service`, body);
}

export function listCheckoutProducts(search?: string) {
  return api.get<{ items: CheckoutProductPickerItem[] }>(
    "checkouts/picker/products",
    { searchParams: search ? { search } : undefined },
  );
}

export function addCheckoutProduct(
  checkoutId: string,
  body: {
    productId: string;
    variantId?: string;
    staffUserId?: string;
    quantity?: number;
  },
) {
  return api.post<Checkout>(`checkouts/${checkoutId}/items/product`, body);
}

export function addWalletDepositLine(
  checkoutId: string,
  body: { amount: number; title?: string },
) {
  return api.post<Checkout>(
    `checkouts/${checkoutId}/items/wallet-deposit`,
    body,
  );
}

export function addGiftCardLine(
  checkoutId: string,
  body: {
    number?: string;
    amount: number;
    ownerContactId: string;
    sendDigital?: boolean;
  },
) {
  return api.post<Checkout>(`checkouts/${checkoutId}/gift-card`, body);
}

export function addPackageLine(
  checkoutId: string,
  body: {
    packageTemplateId: string;
    ownerContactId: string;
    isDemo?: boolean;
  },
) {
  return api.post<Checkout>(`checkouts/${checkoutId}/package`, body);
}

export function voidCheckout(checkoutId: string) {
  return api.delete<Checkout>(`checkouts/${checkoutId}`);
}

export function closeCheckout(
  checkoutId: string,
  body: { tenders: CollectPaymentTender[] },
) {
  return api.post<CloseCheckoutResult>(`checkouts/${checkoutId}/close`, body);
}

export function listCheckoutServices() {
  return api.get<{ items: CheckoutServicePickerItem[] }>(
    "checkouts/picker/services",
  );
}

export function listCheckoutServiceStaff(serviceId: string) {
  return api.get<{ items: CheckoutStaffPickerItem[] }>(
    `checkouts/picker/services/${serviceId}/staff`,
  );
}

export function updateCheckout(
  checkoutId: string,
  body: { contactId?: string; notes?: string | null },
) {
  return api.patch<Checkout>(`checkouts/${checkoutId}`, body);
}

export function updateCheckoutLineItem(
  checkoutId: string,
  lineId: string,
  body: {
    title?: string;
    staffUserId?: string | null;
    quantity?: number;
    unitPrice?: number;
  },
) {
  return api.patch<Checkout>(`checkouts/${checkoutId}/items/${lineId}`, body);
}

export function removeCheckoutLineItem(checkoutId: string, lineId: string) {
  return api.delete<Checkout>(`checkouts/${checkoutId}/items/${lineId}`);
}

export function listCheckoutStaffOffers() {
  return api.get<Array<{ id: string; name: string; description?: string | null }>>(
    "checkouts/picker/offers",
  );
}

export function applyCheckoutOffer(checkoutId: string, offerId: string) {
  return api.post<Checkout>(`checkouts/${checkoutId}/apply-offer`, { offerId });
}

export function removeCheckoutOffer(checkoutId: string, offerId: string) {
  return api.post<Checkout>(`checkouts/${checkoutId}/remove-offer`, { offerId });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until webhook/settlement updates the sale (card payments are async). */
export async function waitForCheckoutSettled(
  checkoutId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<Checkout> {
  const maxAttempts = options?.maxAttempts ?? 30;
  const intervalMs = options?.intervalMs ?? 500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const checkout = await getCheckout(checkoutId);
    if (!checkout.isOpen) {
      return checkout;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }

  return getCheckout(checkoutId);
}
