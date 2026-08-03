import { Injectable } from '@nestjs/common';
import { getMetaGraphBaseUrl } from '@app/modules/integrations/integrations/meta/constants/meta-oauth.constants';
import { FacebookEngagementAdapter } from './facebook-engagement.adapter';
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
 * Instagram Graph uses the same comment endpoints as Facebook Page posts for
 * IG media objects. Metrics use media fields (like_count / comments_count).
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
    return this.facebook.listComments(input);
  }

  reply(input: SocialEngagementMutationInput): Promise<{ id: string }> {
    return this.facebook.reply(input);
  }

  deleteComment(input: SocialEngagementMutationInput): Promise<void> {
    return this.facebook.deleteComment(input);
  }

  async syncPostMetrics(
    input: SocialEngagementMetricsInput,
  ): Promise<SocialPostMetricsSnapshot> {
    const base = getMetaGraphBaseUrl();
    const url = new URL(`${base}/${input.externalPostId}`);
    url.searchParams.set('fields', 'like_count,comments_count');
    url.searchParams.set('access_token', input.accessToken);
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      like_count?: number;
      comments_count?: number;
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
}
