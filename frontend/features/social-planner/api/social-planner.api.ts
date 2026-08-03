import { api } from "@/lib/api/client";
import type {
  ComposeValidationResult,
  CreateSocialPostInput,
  PlatformSchema,
  SocialEngagementFilters,
  SocialEngagementListResult,
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
  return api.get<SocialEngagementListResult>("social-planner/comments", {
    searchParams: filters,
  });
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
