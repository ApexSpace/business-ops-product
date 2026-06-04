import { api } from "@/lib/api/client";
import type { Contact, PaginatedResult } from "@/features/contacts/types";

export type ContactsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listContacts(
  filters: ContactsListFilters = {},
): Promise<PaginatedResult<Contact>> {
  const { items, meta } = await api.getPaginated<Contact>("contacts", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
    },
  });
  return { items, meta };
}

export function getContact(id: string) {
  return api.get<Contact>(`contacts/${id}`);
}

export function createContact(body: Record<string, unknown>) {
  return api.post<Contact>("contacts", body);
}

export function updateContact(id: string, body: Record<string, unknown>) {
  return api.patch<Contact>(`contacts/${id}`, body);
}

export function deleteContact(id: string) {
  return api.delete<void>(`contacts/${id}?confirm=true`);
}
