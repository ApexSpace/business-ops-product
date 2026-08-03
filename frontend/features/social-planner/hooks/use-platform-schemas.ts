"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformSchemas } from "@/features/social-planner/api/social-planner.api";
import { queryKeys } from "@/lib/query/keys";

export function usePlatformSchemas() {
  return useQuery({
    queryKey: queryKeys.socialPlanner.platformSchemas(),
    queryFn: getPlatformSchemas,
    staleTime: 5 * 60 * 1000,
  });
}
