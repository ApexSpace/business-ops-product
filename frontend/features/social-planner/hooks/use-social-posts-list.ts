"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listSocialPosts,
  type SocialPostsListFilters,
} from "@/features/social-planner/api/social-planner.api";
import { queryKeys } from "@/lib/query/keys";

export function useSocialPostsList(filters: SocialPostsListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.socialPlanner.list(filters),
    queryFn: () => listSocialPosts(filters),
  });
}
