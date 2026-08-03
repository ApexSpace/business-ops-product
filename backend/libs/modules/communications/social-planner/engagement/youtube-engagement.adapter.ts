import { Injectable } from '@nestjs/common';
import type {
  SocialEngagementAdapter,
  SocialEngagementCapabilities,
  SocialEngagementComment,
  SocialEngagementListInput,
  SocialEngagementMetricsInput,
  SocialEngagementMutationInput,
  SocialPostMetricsSnapshot,
} from './social-engagement-adapter.interface';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';

interface YouTubeCommentSnippet {
  textDisplay?: string;
  textOriginal?: string;
  authorDisplayName?: string;
  authorChannelId?: { value?: string };
  likeCount?: number;
  publishedAt?: string;
  parentId?: string;
}

interface YouTubeComment {
  id?: string;
  snippet?: YouTubeCommentSnippet;
}

interface YouTubeCommentThread {
  id?: string;
  snippet?: {
    topLevelComment?: YouTubeComment;
    totalReplyCount?: number;
  };
  replies?: { comments?: YouTubeComment[] };
}

@Injectable()
export class YouTubeEngagementAdapter implements SocialEngagementAdapter {
  readonly providerKey = 'youtube';
  readonly capabilities: SocialEngagementCapabilities = {
    listComments: true,
    nestedReplies: true,
    reply: true,
    likeComment: false,
    deleteComment: true,
    syncPostMetrics: true,
    supportsWebhooks: false,
  };

  async listComments(
    input: SocialEngagementListInput,
  ): Promise<SocialEngagementComment[]> {
    const url = new URL(`${YOUTUBE_API}/commentThreads`);
    url.searchParams.set('part', 'snippet,replies');
    url.searchParams.set('videoId', input.externalPostId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('textFormat', 'plainText');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const data = (await response.json()) as {
      items?: YouTubeCommentThread[];
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(data.error?.message ?? 'Failed to fetch YouTube comments');
    }

    return (data.items ?? []).map((thread) => {
      const top = thread.snippet?.topLevelComment;
      const topId = top?.id ?? thread.id ?? '';
      const topSnippet = top?.snippet;
      const replies = (thread.replies?.comments ?? []).map((reply) =>
        mapYouTubeComment(reply, topId),
      );
      return {
        externalCommentId: topId,
        parentExternalCommentId: null,
        authorName: topSnippet?.authorDisplayName ?? null,
        authorExternalId: topSnippet?.authorChannelId?.value ?? null,
        message: topSnippet?.textOriginal ?? topSnippet?.textDisplay ?? '',
        likeCount: topSnippet?.likeCount ?? 0,
        createdTime: topSnippet?.publishedAt ?? null,
        replies,
      };
    });
  }

  async reply(
    input: SocialEngagementMutationInput,
  ): Promise<{ id: string }> {
    const response = await fetch(`${YOUTUBE_API}/comments?part=snippet`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          parentId: input.externalCommentId,
          textOriginal: input.message ?? '',
        },
      }),
    });
    const data = (await response.json()) as {
      id?: string;
      error?: { message?: string };
    };
    if (!response.ok || !data.id) {
      throw new Error(data.error?.message ?? 'Failed to reply on YouTube');
    }
    return { id: data.id };
  }

  async deleteComment(input: SocialEngagementMutationInput): Promise<void> {
    const url = new URL(`${YOUTUBE_API}/comments`);
    url.searchParams.set('id', input.externalCommentId);
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!response.ok && response.status !== 204) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(data.error?.message ?? 'Failed to delete YouTube comment');
    }
  }

  async syncPostMetrics(
    input: SocialEngagementMetricsInput,
  ): Promise<SocialPostMetricsSnapshot> {
    const url = new URL(`${YOUTUBE_API}/videos`);
    url.searchParams.set('part', 'statistics');
    url.searchParams.set('id', input.externalPostId);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    const data = (await response.json()) as {
      items?: Array<{
        statistics?: {
          likeCount?: string;
          commentCount?: string;
          viewCount?: string;
        };
      }>;
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new Error(data.error?.message ?? 'Failed to sync YouTube metrics');
    }
    const stats = data.items?.[0]?.statistics;
    return {
      likes: Number(stats?.likeCount ?? 0),
      comments: Number(stats?.commentCount ?? 0),
      shares: 0,
      reach: 0,
      impressions: 0,
      views: Number(stats?.viewCount ?? 0),
      raw: stats,
    };
  }
}

function mapYouTubeComment(
  comment: YouTubeComment,
  parentId: string | null,
): SocialEngagementComment {
  const snippet = comment.snippet;
  return {
    externalCommentId: comment.id ?? '',
    parentExternalCommentId: parentId ?? snippet?.parentId ?? null,
    authorName: snippet?.authorDisplayName ?? null,
    authorExternalId: snippet?.authorChannelId?.value ?? null,
    message: snippet?.textOriginal ?? snippet?.textDisplay ?? '',
    likeCount: snippet?.likeCount ?? 0,
    createdTime: snippet?.publishedAt ?? null,
    replies: [],
  };
}
