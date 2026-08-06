import { Injectable } from '@nestjs/common';
import { getMetaGraphBaseUrl } from '@app/modules/integrations/integrations/meta/constants/meta-oauth.constants';
import {
  FacebookEngagementAdapter,
  INSTAGRAM_COMMENT_FIELDS,
  fetchGraphComments,
} from './facebook-engagement.adapter';
import type {
  SocialEngagementAdapter,
  SocialEngagementCapabilities,
  SocialEngagementComment,
  SocialEngagementListInput,
  SocialEngagementMetricsInput,
  SocialEngagementMutationInput,
  SocialPostMetricsSnapshot,
} from './social-engagement-adapter.interface';

/**
 * Instagram Graph comment endpoints mirror Facebook, but IG user objects expose
 * `username` (not `name`). Nested replies use the `replies` edge.
 */
@Injectable()
export class InstagramEngagementAdapter implements SocialEngagementAdapter {
  readonly providerKey = 'instagram';
  readonly capabilities: SocialEngagementCapabilities = {
    listComments: true,
    nestedReplies: true,
    reply: true,
    likeComment: false,
    deleteComment: true,
    syncPostMetrics: true,
    supportsWebhooks: true,
  };

  private readonly facebook = new FacebookEngagementAdapter();

  listComments(
    input: SocialEngagementListInput,
  ): Promise<SocialEngagementComment[]> {
    return fetchGraphComments(
      input.externalPostId,
      input.accessToken,
      INSTAGRAM_COMMENT_FIELDS,
    );
  }

  async reply(
    input: SocialEngagementMutationInput,
  ): Promise<{ id: string }> {
    // Instagram uses /{ig-comment-id}/replies — not Facebook's /comments edge.
    const base = getMetaGraphBaseUrl();
    const response = await fetch(
      `${base}/${input.externalCommentId}/replies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          message: input.message ?? '',
          access_token: input.accessToken,
        }),
      },
    );
    const data = (await response.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id) {
      throw new Error(data.error?.message ?? 'Failed to reply to Instagram comment');
    }
    return { id: data.id };
  }

  deleteComment(input: SocialEngagementMutationInput): Promise<void> {
    return this.facebook.deleteComment(input);
  }

  async syncPostMetrics(
    input: SocialEngagementMetricsInput,
  ): Promise<SocialPostMetricsSnapshot> {
    const base = getMetaGraphBaseUrl();
    const url = new URL(`${base}/${input.externalPostId}`);
    url.searchParams.set('fields', 'like_count,comments_count,permalink');
    url.searchParams.set('access_token', input.accessToken);
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      like_count?: number;
      comments_count?: number;
      permalink?: string;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(
        data.error?.message ?? 'Failed to sync Instagram metrics',
      );
    }
    return {
      likes: data.like_count ?? 0,
      comments: data.comments_count ?? 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      views: 0,
      raw: data,
    };
  }

  /** Resolve a public Instagram shortcode URL for an IG Media Graph id. */
  async fetchPermalink(
    externalPostId: string,
    accessToken: string,
  ): Promise<string | null> {
    const base = getMetaGraphBaseUrl();
    const url = new URL(`${base}/${externalPostId}`);
    url.searchParams.set('fields', 'permalink');
    url.searchParams.set('access_token', accessToken);
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as { permalink?: string };
    return data.permalink?.trim() || null;
  }
}
