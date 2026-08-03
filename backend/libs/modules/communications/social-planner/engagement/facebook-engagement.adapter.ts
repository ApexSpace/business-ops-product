import { Injectable } from '@nestjs/common';
import { getMetaGraphBaseUrl } from '@app/modules/integrations/integrations/meta/constants/meta-oauth.constants';
import type {
  SocialEngagementAdapter,
  SocialEngagementCapabilities,
  SocialEngagementComment,
  SocialEngagementListInput,
  SocialEngagementMetricsInput,
  SocialEngagementMutationInput,
  SocialPostMetricsSnapshot,
} from './social-engagement-adapter.interface';

interface GraphFrom {
  id?: string;
  name?: string;
  username?: string;
}

interface GraphCommentNode {
  id?: string;
  message?: string;
  from?: GraphFrom;
  created_time?: string;
  like_count?: number;
  comments?: { data?: GraphCommentNode[] };
}

interface GraphCommentsResponse {
  data?: GraphCommentNode[];
  error?: { message?: string };
}

const META_COMMENT_FIELDS =
  'id,message,from{id,name,username},created_time,like_count,comments.limit(50){id,message,from{id,name,username},created_time,like_count}';

@Injectable()
export class FacebookEngagementAdapter implements SocialEngagementAdapter {
  readonly providerKey = 'facebook';
  readonly capabilities: SocialEngagementCapabilities = {
    listComments: true,
    nestedReplies: true,
    reply: true,
    likeComment: true,
    deleteComment: true,
    syncPostMetrics: true,
    supportsWebhooks: true,
  };

  async listComments(
    input: SocialEngagementListInput,
  ): Promise<SocialEngagementComment[]> {
    const base = getMetaGraphBaseUrl();
    const url = new URL(`${base}/${input.externalPostId}/comments`);
    url.searchParams.set('fields', META_COMMENT_FIELDS);
    url.searchParams.set('limit', '50');
    url.searchParams.set('access_token', input.accessToken);
    const response = await fetch(url.toString());
    const data = (await response.json()) as GraphCommentsResponse;
    if (!response.ok) {
      throw new Error(data.error?.message ?? 'Failed to fetch Facebook comments');
    }
    return (data.data ?? []).map((node) => mapGraphComment(node));
  }

  async reply(
    input: SocialEngagementMutationInput,
  ): Promise<{ id: string }> {
    const base = getMetaGraphBaseUrl();
    const response = await fetch(
      `${base}/${input.externalCommentId}/comments`,
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
      throw new Error(data.error?.message ?? 'Failed to reply to comment');
    }
    return { id: data.id };
  }

  async likeComment(input: SocialEngagementMutationInput): Promise<void> {
    const base = getMetaGraphBaseUrl();
    const response = await fetch(`${base}/${input.externalCommentId}/likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ access_token: input.accessToken }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      throw new Error(data.error?.message ?? 'Failed to like comment');
    }
  }

  async deleteComment(input: SocialEngagementMutationInput): Promise<void> {
    const base = getMetaGraphBaseUrl();
    const response = await fetch(
      `${base}/${input.externalCommentId}?access_token=${encodeURIComponent(input.accessToken)}`,
      { method: 'DELETE' },
    );
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      throw new Error(data.error?.message ?? 'Failed to delete comment');
    }
  }

  async syncPostMetrics(
    input: SocialEngagementMetricsInput,
  ): Promise<SocialPostMetricsSnapshot> {
    const base = getMetaGraphBaseUrl();
    const url = new URL(`${base}/${input.externalPostId}`);
    url.searchParams.set(
      'fields',
      'reactions.summary(true),comments.summary(true),shares',
    );
    url.searchParams.set('access_token', input.accessToken);
    const response = await fetch(url.toString());
    const data = (await response.json()) as {
      reactions?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(data.error?.message ?? 'Failed to sync Facebook metrics');
    }
    return {
      likes: data.reactions?.summary?.total_count ?? 0,
      comments: data.comments?.summary?.total_count ?? 0,
      shares: data.shares?.count ?? 0,
      reach: 0,
      impressions: 0,
      views: 0,
      raw: data,
    };
  }
}

export function mapGraphComment(node: GraphCommentNode): SocialEngagementComment {
  const from = node.from;
  return {
    externalCommentId: node.id ?? '',
    parentExternalCommentId: null,
    authorName: from?.name ?? from?.username ?? null,
    authorExternalId: from?.id ?? null,
    message: node.message ?? '',
    likeCount: node.like_count ?? 0,
    createdTime: node.created_time ?? null,
    replies: (node.comments?.data ?? []).map((reply) => ({
      ...mapGraphComment(reply),
      parentExternalCommentId: node.id ?? null,
    })),
  };
}
