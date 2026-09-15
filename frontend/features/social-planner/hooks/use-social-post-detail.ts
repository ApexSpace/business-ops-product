"use client";

import { useQuery } from "@tanstack/react-query";
import { getSocialPost } from "@/features/social-planner/api/social-planner.api";
import { queryKeys } from "@/lib/query/keys";

export function useSocialPostDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.socialPlanner.detail(id ?? ""),
    queryFn: () => getSocialPost(id!),
    enabled: Boolean(id),
  });
}
