"use client";

import { useQuery } from "@tanstack/react-query";
import { listYouTubeCategories } from "@/features/social-planner/api/youtube-categories.api";

export function useYouTubeCategories(enabled = true) {
  return useQuery({
    queryKey: ["social-planner", "youtube", "categories"],
    queryFn: () => listYouTubeCategories(),
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
