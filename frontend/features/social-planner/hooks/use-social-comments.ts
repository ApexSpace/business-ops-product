"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteSocialComment,
  likeSocialComment,
  listSocialEngagement,
  markSocialCommentsRead,
  normalizeEngagementResult,
  replySocialComment,
} from "@/features/social-planner/api/social-planner.api";
import type {
  SocialComment,
  SocialEngagementFilters,
  SocialEngagementListResult,
  SocialEngagementPostGroup,
} from "@/features/social-planner/types";
import { queryKeys } from "@/lib/query/keys";

const ENGAGEMENT_ROOT_KEY = ["social-planner", "engagement", "v2"] as const;

const EMPTY_ENGAGEMENT: SocialEngagementListResult = {
  items: [],
  totalComments: 0,
  unreadCount: 0,
  warnings: [],
};

export const OPTIMISTIC_COMMENT_ID_PREFIX = "optimistic:";

export function isOptimisticCommentId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_COMMENT_ID_PREFIX);
}

export function useSocialEngagement(filters: SocialEngagementFilters = {}) {
  const listFilters = {
    ...(filters.providerKey ? { providerKey: filters.providerKey } : {}),
    ...(filters.socialPostId ? { socialPostId: filters.socialPostId } : {}),
    ...(filters.unreadOnly ? { unreadOnly: filters.unreadOnly } : {}),
    ...(filters.search ? { search: filters.search } : {}),
  };

  return useQuery({
    queryKey: queryKeys.socialPlanner.engagement(listFilters),
    queryFn: () => listSocialEngagement(listFilters),
    // Always flatten — never leave callers reading data.meta.warnings
    select: (raw) => normalizeEngagementResult(raw),
    placeholderData: (previous) => previous ?? EMPTY_ENGAGEMENT,
  });
}

/** @deprecated Prefer useSocialEngagement */
export function useSocialComments(filters: SocialEngagementFilters = {}) {
  return useSocialEngagement(filters);
}

type ReplyVars = {
  commentId: string;
  message: string;
  providerKey: string;
  socialPostTargetId?: string;
  externalPostId?: string;
  permalink?: string | null;
};

type LikeVars = {
  commentId: string;
  providerKey: string;
  socialPostTargetId?: string;
};

type DeleteVars = {
  commentId: string;
  providerKey: string;
  socialPostTargetId?: string;
};

type MutationSnapshot = {
  previous: Array<[QueryKey, SocialEngagementListResult | undefined]>;
};

function mapComments(
  comments: SocialComment[],
  mapper: (comment: SocialComment) => SocialComment | null,
): SocialComment[] {
  const next: SocialComment[] = [];
  for (const comment of comments) {
    const mapped = mapper({
      ...comment,
      replies: mapComments(comment.replies ?? [], mapper),
    });
    if (mapped) next.push(mapped);
  }
  return next;
}

function patchEngagementCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: (data: SocialEngagementListResult) => SocialEngagementListResult,
): MutationSnapshot {
  const previous = queryClient.getQueriesData<SocialEngagementListResult>({
    queryKey: ENGAGEMENT_ROOT_KEY,
  });
  queryClient.setQueriesData<SocialEngagementListResult>(
    { queryKey: ENGAGEMENT_ROOT_KEY },
    (current) => {
      if (!current) return current;
      return patch(current);
    },
  );
  return { previous,
};
}

function restoreEngagementCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshot?: MutationSnapshot,
) {
  if (!snapshot) return;
  for (const [key, data] of snapshot.previous) {
    queryClient.setQueryData(key, data);
  }
}

function appendOptimisticReply(
  data: SocialEngagementListResult,
  vars: ReplyVars,
  optimisticId: string,
): SocialEngagementListResult {
  const optimisticReply: SocialComment = {
    id: optimisticId,
    externalCommentId: optimisticId,
    message: vars.message,
    fromName: "You",
    createdTime: new Date().toISOString(),
    likeCount: 0,
    isRead: true,
    providerKey: vars.providerKey,
    externalPostId: vars.externalPostId ?? "",
    socialPostTargetId: vars.socialPostTargetId ?? "",
    permalink: vars.permalink ?? null,
    replies: [],
  };

  const items = data.items.map((group) => {
    if (
      vars.socialPostTargetId &&
      group.socialPostTargetId !== vars.socialPostTargetId
    ) {
      return group;
    }

    let matched = false;
    const comments = mapComments(group.comments, (comment) => {
      if (comment.id !== vars.commentId) return comment;
      matched = true;
      return {
        ...comment,
        replies: [...(comment.replies ?? []), optimisticReply],
      };
    });

    if (!matched) return group;
    return {
      ...group,
      comments,
      metrics: group.metrics
        ? { ...group.metrics, comments: group.metrics.comments + 1,
}
        : group.metrics,
    };
  });

  return {
    ...data,
    items,
    totalComments: data.totalComments + 1,
  };
}

function bumpLike(
  data: SocialEngagementListResult,
  commentId: string,
): SocialEngagementListResult {
  return {
    ...data,
    items: data.items.map((group) => ({
      ...group,
      comments: mapComments(group.comments, (comment) =>
        comment.id === commentId
          ? { ...comment, likeCount: comment.likeCount + 1,
}
          : comment,
      ),
    })),
  };
}

function removeComment(
  data: SocialEngagementListResult,
  commentId: string,
): SocialEngagementListResult {
  let removed = 0;
  const items = data.items.map((group) => {
    let groupRemoved = 0;
    const comments = mapComments(group.comments, (comment) => {
      if (comment.id !== commentId) return comment;
      groupRemoved += 1;
      removed += 1;
      return null;
    });
    return {
      ...group,
      comments,
      metrics:
        group.metrics && groupRemoved > 0
          ? {
              ...group.metrics,
              comments: Math.max(0, group.metrics.comments - groupRemoved),
            }
          : group.metrics,
    };
  });

  return {
    ...data,
    items,
    totalComments: Math.max(0, data.totalComments - removed),
  };
}

export function useSocialCommentMutations(
  filters: SocialEngagementFilters = {},
) {
  const queryClient = useQueryClient();
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const listFilters = {
    ...(filters.providerKey ? { providerKey: filters.providerKey } : {}),
    ...(filters.socialPostId ? { socialPostId: filters.socialPostId } : {}),
  };

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ENGAGEMENT_ROOT_KEY,
    });

  const sync = useMutation({
    mutationKey: ["social-planner", "engagement-sync"],
    mutationFn: () =>
      listSocialEngagement({
        ...listFilters,
        refresh: true,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.socialPlanner.engagement(listFilters),
        data,
      );
      toast.success("Synced from channels");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Sync failed");
    },
  });

  const reply = useMutation({
    mutationKey: ["social-planner", "comment-reply"],
    mutationFn: (vars: ReplyVars) =>
      replySocialComment(vars.commentId, {
        message: vars.message,
        providerKey: vars.providerKey,
        socialPostTargetId: vars.socialPostTargetId,
      }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ENGAGEMENT_ROOT_KEY });
      const optimisticId = `${OPTIMISTIC_COMMENT_ID_PREFIX}reply-${vars.commentId}-${Date.now()}`;
      const snapshot = patchEngagementCaches(queryClient, (data) =>
        appendOptimisticReply(data, vars, optimisticId),
      );
      return { ...snapshot, optimisticId,
};
    },
    onError: (error: Error, _vars, context) => {
      restoreEngagementCaches(queryClient, context);
      toast.error(error.message || "Reply failed");
    },
    onSuccess: () => {
      toast.success("Reply sent");
    },
    onSettled: async () => {
      await invalidate();
    },
  });

  const like = useMutation({
    mutationKey: ["social-planner", "comment-like"],
    mutationFn: (vars: LikeVars) =>
      likeSocialComment(
        vars.commentId,
        vars.providerKey,
        vars.socialPostTargetId,
      ),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ENGAGEMENT_ROOT_KEY });
      setLikedIds((prev) => new Set(prev).add(vars.commentId));
      return patchEngagementCaches(queryClient, (data) =>
        bumpLike(data, vars.commentId),
      );
    },
    onError: (error: Error, vars, context) => {
      restoreEngagementCaches(queryClient, context);
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(vars.commentId);
        return next;
      });
      toast.error(error.message || "Like failed");
    },
    onSuccess: () => {
      toast.success("Liked");
    },
    onSettled: async () => {
      await invalidate();
    },
  });

  const remove = useMutation({
    mutationKey: ["social-planner", "comment-delete"],
    mutationFn: (vars: DeleteVars) =>
      deleteSocialComment(
        vars.commentId,
        vars.providerKey,
        vars.socialPostTargetId,
      ),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ENGAGEMENT_ROOT_KEY });
      return patchEngagementCaches(queryClient, (data) =>
        removeComment(data, vars.commentId),
      );
    },
    onError: (error: Error, _vars, context) => {
      restoreEngagementCaches(queryClient, context);
      toast.error(error.message || "Delete failed");
    },
    onSuccess: () => {
      toast.success("Comment deleted");
    },
    onSettled: async () => {
      await invalidate();
    },
  });

  const markRead = useMutation({
    mutationFn: (body: {
      ids?: string[];
      providerKey?: string;
      socialPostId?: string;
    }) => markSocialCommentsRead(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ENGAGEMENT_ROOT_KEY });
      return patchEngagementCaches(queryClient, (data) => ({
        ...data,
        unreadCount: 0,
        items: data.items.map((group) => {
          if (body.socialPostId && group.socialPostId !== body.socialPostId) {
            return group;
          }
          if (body.providerKey && group.providerKey !== body.providerKey) {
            return group;
          }
          return {
            ...group,
            comments: mapComments(group.comments, (comment) => ({
              ...comment,
              isRead: true,
            })),
          };
        }),
      }));
    },
    onError: (error: Error, _vars, context) => {
      restoreEngagementCaches(queryClient, context);
      toast.error(error.message || "Failed to mark read");
    },
    onSettled: async () => {
      await invalidate();
    },
  });

  const replyPendingId = reply.isPending
    ? (reply.variables?.commentId ?? null)
    : null;
  const likePendingId = like.isPending
    ? (like.variables?.commentId ?? null)
    : null;
  const deletePendingId = remove.isPending
    ? (remove.variables?.commentId ?? null)
    : null;

  return {
    sync,
    reply,
    like,
    remove,
    markRead,
    likedIds,
    replyPendingId,
    likePendingId,
    deletePendingId,
    /** Guarded mutators — no-ops while the same action is already in flight. */
    replyToComment(vars: ReplyVars) {
      if (reply.isPending) return;
      if (isOptimisticCommentId(vars.commentId)) return;
      if (!vars.message.trim()) return;
      reply.mutate({ ...vars, message: vars.message.trim() });
    },
    likeComment(vars: LikeVars) {
      if (like.isPending) return;
      if (likedIds.has(vars.commentId)) return;
      if (isOptimisticCommentId(vars.commentId)) return;
      like.mutate(vars);
    },
    deleteComment(vars: DeleteVars) {
      if (remove.isPending) return;
      if (isOptimisticCommentId(vars.commentId)) return;
      remove.mutate(vars);
    },
  };
}

/** Helper for pages that need group context when starting a reply. */
export function findCommentContext(
  items: SocialEngagementPostGroup[],
  commentId: string,
): {
  comment: SocialComment;
  group: SocialEngagementPostGroup;
} | null {
  for (const group of items) {
    const stack = [...group.comments];
    while (stack.length) {
      const comment = stack.pop()!;
      if (comment.id === commentId) return { comment, group,
};
      stack.push(...(comment.replies ?? []));
    }
  }
  return null;
}
