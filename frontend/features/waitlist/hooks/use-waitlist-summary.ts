"use client";

import { useQuery } from "@tanstack/react-query";
import { getWaitlistSummary } from "@/features/waitlist/api/waitlist.api";
import { useCanShowWaitlistChrome } from "@/features/waitlist/hooks/use-can-show-waitlist-chrome";
import { queryKeys } from "@/lib/query/keys";

export function useWaitlistSummary() {
  const enabled = useCanShowWaitlistChrome();
  return useQuery({
    queryKey: queryKeys.waitlist.summary(),
    queryFn: getWaitlistSummary,
    refetchInterval: 30_000,
    enabled,
  });
}
