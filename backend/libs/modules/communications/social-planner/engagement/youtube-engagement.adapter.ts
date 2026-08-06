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
    /** Top-level + one reply level only (YouTube API constraint). */
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
    const threads: SocialEngagementComment[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${YOUTUBE_API}/commentThreads`);
      url.searchParams.set('part', 'snippet,replies');
      url.searchParams.set('videoId', input.externalPostId);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('textFormat', 'plainText');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      });
      const data = (await response.json()) as {
        items?: YouTubeCommentThread[];
        nextPageToken?: string;
        error?: { message?: string; errors?: Array<{ reason?: string }> };
      };
      if (!response.ok) {
        const reason = data.error?.errors?.[0]?.reason;
        throw new Error(
          data.error?.message ??
            (reason === 'quotaExceeded'
              ? 'YouTube API quota exceeded while listing comments'
              : 'Failed to fetch YouTube comments'),
        );
      }

      for (const thread of data.items ?? []) {
        const top = thread.snippet?.topLevelComment;
        const topId = top?.id ?? thread.id ?? '';
        if (!topId) continue;
        const topSnippet = top?.snippet;
        const totalReplyCount = thread.snippet?.totalReplyCount ?? 0;
        let replies = (thread.replies?.comments ?? []).map((reply) =>
          mapYouTubeComment(reply, topId),
        );

        if (totalReplyCount > replies.length) {
          const extra = await this.listRepliesForParent(
            input.accessToken,
            topId,
          );
          const seen = new Set(replies.map((r) => r.externalCommentId));
          for (const reply of extra) {
            if (!seen.has(reply.externalCommentId)) {
              replies.push(reply);
              seen.add(reply.externalCommentId);
            }
          }
        }

        threads.push({
          externalCommentId: topId,
          parentExternalCommentId: null,
          authorName: topSnippet?.authorDisplayName ?? null,
          authorExternalId: topSnippet?.authorChannelId?.value ?? null,
          message: topSnippet?.textOriginal ?? topSnippet?.textDisplay ?? '',
          likeCount: topSnippet?.likeCount ?? 0,
          createdTime: topSnippet?.publishedAt ?? null,
          replies,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return threads;
  }

  async reply(
    input: SocialEngagementMutationInput,
  ): Promise<{ id: string }> {
    // YouTube only allows replies to top-level comments. Callers must pass
    // the top-level parent id (service remaps nested replies).
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

  private async listRepliesForParent(
    accessToken: string,
    parentId: string,
  ): Promise<SocialEngagementComment[]> {
    const replies: SocialEngagementComment[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(`${YOUTUBE_API}/comments`);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('parentId', parentId);
      url.searchParams.set('maxResults', '100');
      url.searchParams.set('textFormat', 'plainText');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await response.json()) as {
        items?: YouTubeComment[];
        nextPageToken?: string;
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(
          data.error?.message ?? 'Failed to fetch YouTube comment replies',
        );
      }
      for (const item of data.items ?? []) {
        replies.push(mapYouTubeComment(item, parentId));
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    return replies;
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
