import { api } from "@/lib/api/client";
import type { PaginatedResult, Payment, PaymentsOverview } from "@/features/payments/types";

export type PaymentsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  invoiceId?: string;
  contactId?: string;
  method?: string;
  paidFrom?: string;
  paidTo?: string;
};

export async function listPayments(
  filters: PaymentsListFilters = {},
): Promise<PaginatedResult<Payment>> {
  const { items, meta } = await api.getPaginated<Payment>("payments", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      invoiceId: filters.invoiceId,
      contactId: filters.contactId,
      method: filters.method,
      paidFrom: filters.paidFrom,
      paidTo: filters.paidTo,
    },
  });
  return { items, meta };
}

export function getPayment(id: string) {
  return api.get<Payment>(`payments/${id}`);
}

export function createPayment(body: Record<string, unknown>) {
  return api.post<Payment>("payments", body);
}

export function updatePayment(id: string, body: Record<string, unknown>) {
  return api.patch<Payment>(`payments/${id}`, body);
}

export function deletePayment(id: string) {
  return api.delete<void>(`payments/${id}?confirm=true`);
}

export function refundPayment(id: string) {
  return api.post<Payment>(`payments/${id}/refund`);
}

export function getPaymentsOverview() {
  return api.get<PaymentsOverview>("payments/overview");
}
