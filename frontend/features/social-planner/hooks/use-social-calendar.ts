"use client";

import { useQuery } from "@tanstack/react-query";
import { getSocialCalendar } from "@/features/social-planner/api/social-planner.api";
import { queryKeys } from "@/lib/query/keys";

export function useSocialCalendar(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.socialPlanner.calendar(from, to),
    queryFn: () => getSocialCalendar(from, to),
    enabled: Boolean(from && to),
  });
}
