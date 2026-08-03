"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deleteSocialComment,
  likeSocialComment,
  listSocialEngagement,
  markSocialCommentsRead,
  replySocialComment,
} from "@/features/social-planner/api/social-planner.api";
import type { SocialEngagementFilters } from "@/features/social-planner/types";
import { queryKeys } from "@/lib/query/keys";

export function useSocialEngagement(filters: SocialEngagementFilters = {}) {
  return useQuery({
    queryKey: queryKeys.socialPlanner.engagement(filters),
    queryFn: () =>
      listSocialEngagement({
        ...filters,
        refresh: filters.refresh === true,
      }),
  });
}

/** @deprecated Prefer useSocialEngagement */
export function useSocialComments(filters: SocialEngagementFilters = {}) {
  return useSocialEngagement(filters);
}

export function useSocialCommentMutations(
  filters: SocialEngagementFilters = {},
) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["social-planner", "engagement"],
    });

  const reply = useMutation({
    mutationFn: ({
      commentId,
      message,
      providerKey,
      socialPostTargetId,
    }: {
      commentId: string;
      message: string;
      providerKey: string;
      socialPostTargetId?: string;
    }) =>
      replySocialComment(commentId, {
        message,
        providerKey,
        socialPostTargetId,
      }),
    onSuccess: async () => {
      toast.success("Reply sent");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Reply failed"),
  });

  const like = useMutation({
    mutationFn: ({
      commentId,
      providerKey,
      socialPostTargetId,
    }: {
      commentId: string;
      providerKey: string;
      socialPostTargetId?: string;
    }) => likeSocialComment(commentId, providerKey, socialPostTargetId),
    onSuccess: async () => {
      toast.success("Liked");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Like failed"),
  });

  const remove = useMutation({
    mutationFn: ({
      commentId,
      providerKey,
      socialPostTargetId,
    }: {
      commentId: string;
      providerKey: string;
      socialPostTargetId?: string;
    }) => deleteSocialComment(commentId, providerKey, socialPostTargetId),
    onSuccess: async () => {
      toast.success("Comment deleted");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message || "Delete failed"),
  });

  const markRead = useMutation({
    mutationFn: (body: {
      ids?: string[];
      providerKey?: string;
      socialPostId?: string;
    }) => markSocialCommentsRead(body),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to mark read"),
  });

  return { reply, like, remove, markRead };
}
