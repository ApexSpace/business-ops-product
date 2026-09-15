"use client";

import { useQuery } from "@tanstack/react-query";
import { getTikTokCreatorInfo } from "@/features/social-planner/api/tiktok-creator-info.api";

export function useTikTokCreatorInfo(resourceId: string | undefined | null) {
  return useQuery({
    queryKey: ["social-planner", "tiktok", "creator-info", resourceId],
    queryFn: () => getTikTokCreatorInfo(resourceId!),
    enabled: Boolean(resourceId),
    staleTime: 60_000,
    retry: 1,
  });
}
