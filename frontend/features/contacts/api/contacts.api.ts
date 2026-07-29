import { api } from "@/lib/api/client";
import type { Contact, PaginatedResult } from "@/features/contacts/types";

export const DEFAULT_CONTACTS_API_BASE = "contacts";

export type ContactsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export async function listContacts(
  filters: ContactsListFilters = {},
  apiBase: string = DEFAULT_CONTACTS_API_BASE,
): Promise<PaginatedResult<Contact>> {
  const { items, meta } = await api.getPaginated<Contact>(apiBase, {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
    },
  });
  return { items, meta };
}

export function getContact(
  id: string,
  apiBase: string = DEFAULT_CONTACTS_API_BASE,
) {
  return api.get<Contact>(path(apiBase, id));
}

export function createContact(
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_CONTACTS_API_BASE,
) {
  return api.post<Contact>(apiBase, body);
}

export function updateContact(id: string, body: Record<string, unknown>) {
  return api.patch<Contact>(`contacts/${id}`, body);
}

export function deleteContact(id: string) {
  return api.delete<void>(`contacts/${id}?confirm=true`);
}

export function mergeContacts(keepContactId: string, mergeContactId: string) {
  return api.post<Contact>(`contacts/${keepContactId}/merge`, {
    mergeContactId,
  });
}
