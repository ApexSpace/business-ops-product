"use client";

import { useQuery } from "@tanstack/react-query";
import { listWaitlistEntries } from "@/features/waitlist/api/waitlist.api";
import { useCanShowWaitlistChrome } from "@/features/waitlist/hooks/use-can-show-waitlist-chrome";
import type { WaitlistListFilters } from "@/features/waitlist/types";
import { queryKeys, type ListFilters } from "@/lib/query/keys";

export function useWaitlistList(
  filters: WaitlistListFilters = {},
  options?: { enabled?: boolean },
) {
  const allowed = useCanShowWaitlistChrome();
  return useQuery({
    queryKey: queryKeys.waitlist.list(filters as ListFilters),
    queryFn: () => listWaitlistEntries(filters),
    enabled: allowed && (options?.enabled ?? true),
  });
}
