import { api } from "@/lib/api/client";

export interface ContactPaymentMethod {
  id: string;
  brand?: string | null;
  last4?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  isDefault: boolean;
}

export function listContactPaymentMethods(contactId: string) {
  return api.get<{ items: ContactPaymentMethod[] }>(
    `payments/contact-methods/${contactId}`,
  );
}

export function createContactSetupIntent(contactId: string) {
  return api.post<{ clientSecret: string }>(
    `payments/contact-methods/${contactId}/setup-intent`,
    {},
  );
}

export function detachContactPaymentMethod(
  contactId: string,
  methodId: string,
) {
  return api.delete<{ success: boolean }>(
    `payments/contact-methods/${contactId}/${methodId}`,
  );
}
