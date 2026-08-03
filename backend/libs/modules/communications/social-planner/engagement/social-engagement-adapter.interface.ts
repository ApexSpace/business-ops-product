export interface SocialEngagementCapabilities {
  listComments: boolean;
  nestedReplies: boolean;
  reply: boolean;
  likeComment: boolean;
  deleteComment: boolean;
  syncPostMetrics: boolean;
  supportsWebhooks: boolean;
}

export interface SocialEngagementComment {
  externalCommentId: string;
  parentExternalCommentId: string | null;
  authorName: string | null;
  authorExternalId: string | null;
  message: string;
  likeCount: number;
  createdTime: string | null;
  replies: SocialEngagementComment[];
}

export interface SocialEngagementListInput {
  externalPostId: string;
  accessToken: string;
  /** Optional page/channel id when the adapter needs it (YouTube channel). */
  externalResourceId?: string | null;
}

export interface SocialEngagementMutationInput {
  externalCommentId: string;
  accessToken: string;
  message?: string;
}

export interface SocialPostMetricsSnapshot {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  views: number;
  raw?: unknown;
}

export interface SocialEngagementMetricsInput {
  externalPostId: string;
  accessToken: string;
  externalResourceId?: string | null;
}

export interface SocialEngagementAdapter {
  readonly providerKey: string;
  readonly capabilities: SocialEngagementCapabilities;

  listComments(
    input: SocialEngagementListInput,
  ): Promise<SocialEngagementComment[]>;

  reply(input: SocialEngagementMutationInput): Promise<{ id: string }>;

  likeComment?(input: SocialEngagementMutationInput): Promise<void>;

  deleteComment(input: SocialEngagementMutationInput): Promise<void>;

  syncPostMetrics(
    input: SocialEngagementMetricsInput,
  ): Promise<SocialPostMetricsSnapshot>;
}
