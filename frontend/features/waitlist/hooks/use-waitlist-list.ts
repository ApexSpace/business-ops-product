import { useQuery } from "@tanstack/react-query";
import { listWaitlistEntries } from "@/features/waitlist/api/waitlist.api";
import type { WaitlistListFilters } from "@/features/waitlist/types";
import { queryKeys, type ListFilters } from "@/lib/query/keys";

export function useWaitlistList(filters: WaitlistListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.waitlist.list(filters as ListFilters),
    queryFn: () => listWaitlistEntries(filters),
  });
}
