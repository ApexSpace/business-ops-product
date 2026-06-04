"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listContacts, type ContactsListFilters } from "@/features/contacts/api/contacts.api";
import { queryKeys } from "@/lib/query/keys";

export function useContactsList(filters: ContactsListFilters) {
  return useQuery({
    queryKey: queryKeys.contacts.list(filters),
    queryFn: () => listContacts(filters),
    placeholderData: keepPreviousData,
  });
}
