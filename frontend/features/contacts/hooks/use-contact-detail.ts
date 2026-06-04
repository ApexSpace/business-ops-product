"use client";

import { useQuery } from "@tanstack/react-query";
import { getContact } from "@/features/contacts/api/contacts.api";
import { queryKeys } from "@/lib/query/keys";

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => getContact(id),
    enabled: !!id,
  });
}
