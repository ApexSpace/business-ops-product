import { api } from "@/lib/api/client";
import type {
  ComposeValidationResult,
  CreateSocialPostInput,
  PlatformSchema,
  SocialEngagementFilters,
  SocialEngagementListResult,
  SocialEngagementPostGroup,
  SocialPost,
} from "@/features/social-planner/types";

export type SocialPostsListFilters = {
  page?: number;
  limit?: number;
  status?: string;
  providerKey?: string;
  from?: string;
  to?: string;
};

export function listSocialPosts(filters: SocialPostsListFilters = {}) {
  return api.getPaginated<SocialPost>("social-planner/posts", {
    searchParams: filters,
  });
}

export function getSocialPost(id: string) {
  return api.get<SocialPost>(`social-planner/posts/${id}`);
}

export function createSocialPost(body: CreateSocialPostInput) {
  return api.post<SocialPost>("social-planner/posts", body);
}

export function updateSocialPost(
  id: string,
  body: Partial<CreateSocialPostInput>,
) {
  return api.patch<SocialPost>(`social-planner/posts/${id}`, body);
}

export function deleteSocialPost(id: string) {
  return api.delete<SocialPost>(`social-planner/posts/${id}`, {
    searchParams: { confirm: true },
  });
}

export function validateSocialPost(body: CreateSocialPostInput) {
  return api.post<ComposeValidationResult>(
    "social-planner/posts/validate",
    body,
  );
}

export function scheduleSocialPost(
  id: string,
  body: { scheduledAt: string; timezone?: string },
) {
  return api.post<SocialPost>(`social-planner/posts/${id}/schedule`, body);
}

export function publishSocialPostNow(id: string) {
  return api.post<SocialPost>(`social-planner/posts/${id}/publish-now`);
}

export function cancelSocialPost(id: string) {
  return api.post<SocialPost>(`social-planner/posts/${id}/cancel`);
}

export function retrySocialPostTarget(targetId: string) {
  return api.post<SocialPost>(`social-planner/targets/${targetId}/retry`);
}

export function getSocialCalendar(from: string, to: string) {
  return api.get<SocialPost[]>("social-planner/calendar", {
    searchParams: { from, to },
  });
}

export function getPlatformSchemas() {
  return api.get<PlatformSchema[]>("social-planner/platform-schemas");
}

export function listSocialEngagement(filters: SocialEngagementFilters = {}) {
  return api
    .get<SocialEngagementListResult | SocialEngagementPostGroup[]>(
      "social-planner/comments",
      { searchParams: filters },
    )
    .then(normalizeEngagementResult);
}

/** Guards against envelope/interceptor shape drift so the UI never crashes on meta. */
export function normalizeEngagementResult(
  raw: unknown,
): SocialEngagementListResult {
  if (Array.isArray(raw)) {
    return {
      items: raw as SocialEngagementPostGroup[],
      totalComments: raw.length,
      unreadCount: 0,
      warnings: [],
    };
  }

  if (!raw || typeof raw !== "object") {
    return { items: [], totalComments: 0, unreadCount: 0, warnings: [],
};
  }

  const record = raw as Record<string, unknown>;
  const nestedMeta =
    record.meta && typeof record.meta === "object"
      ? (record.meta as Record<string, unknown>)
      : null;

  const items = Array.isArray(record.items)
    ? (record.items as SocialEngagementPostGroup[])
    : [];

  const warningsRaw = record.warnings ?? nestedMeta?.warnings;
  const unreadRaw = record.unreadCount ?? nestedMeta?.unreadCount;
  const totalRaw = record.totalComments ?? nestedMeta?.totalComments;

  return {
    items,
    totalComments: typeof totalRaw === "number" ? totalRaw : items.length,
    unreadCount: typeof unreadRaw === "number" ? unreadRaw : 0,
    warnings: Array.isArray(warningsRaw)
      ? warningsRaw.filter((w): w is string => typeof w === "string")
      : [],
  };
}

/** @deprecated Use listSocialEngagement */
export function listSocialComments(filters: SocialEngagementFilters = {}) {
  return listSocialEngagement(filters);
}

export function replySocialComment(
  commentId: string,
  body: {
    message: string;
    providerKey: string;
    socialPostTargetId?: string;
  },
) {
  return api.post<{ id: string }>(
    `social-planner/comments/${commentId}/reply`,
    body,
  );
}

export function likeSocialComment(
  commentId: string,
  providerKey: string,
  socialPostTargetId?: string,
) {
  return api.post<{ success: true }>(
    `social-planner/comments/${commentId}/like`,
    undefined,
    {
      searchParams: {
        providerKey,
        ...(socialPostTargetId ? { socialPostTargetId } : {}),
      },
    },
  );
}

export function deleteSocialComment(
  commentId: string,
  providerKey: string,
  socialPostTargetId?: string,
) {
  return api.delete<{ success: true }>(`social-planner/comments/${commentId}`, {
    searchParams: {
      providerKey,
      ...(socialPostTargetId ? { socialPostTargetId } : {}),
    },
  });
}

export function markSocialCommentsRead(body: {
  ids?: string[];
  providerKey?: string;
  socialPostId?: string;
}) {
  return api.post<{ success: true }>("social-planner/comments/mark-read", body);
}
