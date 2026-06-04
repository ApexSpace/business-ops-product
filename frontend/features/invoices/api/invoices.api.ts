import { api } from "@/lib/api/client";
import type { Invoice, PaginatedResult } from "@/features/invoices/types";

export type InvoicesListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  status?: string;
  issueFrom?: string;
  issueTo?: string;
};

export async function listInvoices(
  filters: InvoicesListFilters = {},
): Promise<PaginatedResult<Invoice>> {
  const { items, meta } = await api.getPaginated<Invoice>("invoices", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      contactId: filters.contactId,
      status: filters.status,
      issueFrom: filters.issueFrom,
      issueTo: filters.issueTo,
    },
  });
  return { items, meta };
}

export function getInvoice(id: string) {
  return api.get<Invoice>(`invoices/${id}`);
}

export function createInvoice(body: Record<string, unknown>) {
  return api.post<Invoice>("invoices", body);
}

export function updateInvoice(id: string, body: Record<string, unknown>) {
  return api.patch<Invoice>(`invoices/${id}`, body);
}

export function deleteInvoice(id: string) {
  return api.delete<void>(`invoices/${id}?confirm=true`);
}

export function duplicateInvoice(id: string) {
  return api.post<Invoice>(`invoices/${id}/duplicate`);
}

export function updateInvoiceStatus(
  id: string,
  status: Invoice["status"],
) {
  return api.patch<Invoice>(`invoices/${id}/status`, { status });
}
