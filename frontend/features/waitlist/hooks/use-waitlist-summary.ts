import { useQuery } from "@tanstack/react-query";
import { getWaitlistSummary } from "@/features/waitlist/api/waitlist.api";
import { queryKeys } from "@/lib/query/keys";

export function useWaitlistSummary() {
  return useQuery({
    queryKey: queryKeys.waitlist.summary(),
    queryFn: getWaitlistSummary,
    refetchInterval: 30_000,
  });
}
