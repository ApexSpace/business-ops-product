export type SocialPostStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export type SocialPostTargetStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED";

export interface SocialPostTarget {
  id: string;
  providerKey: string;
  integrationResourceId: string | null;
  resourceName: string | null;
  postType: string;
  platformPayload: Record<string, unknown>;
  status: SocialPostTargetStatus;
  scheduledAt: string | null;
  externalPostId: string | null;
  permalink: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptCount: number;
  publishedAt: string | null;
}

export interface SocialPostMedia {
  id: string;
  fileAssetId: string;
  thumbnailFileAssetId?: string | null;
  sortOrder: number;
  altText: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export interface SocialPost {
  id: string;
  status: SocialPostStatus;
  caption: string;
  scheduledAt: string | null;
  timezone: string | null;
  publishedAt: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  targets: SocialPostTarget[];
  media: SocialPostMedia[];
}

export interface PlatformFieldDefinition {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "boolean" | "number";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
  defaultValue?: string | number | boolean;
}

export interface PlatformSchema {
  providerKey: string;
  displayName: string;
  captionMaxLength: number;
  postTypes: Array<{ key: string; label: string }>;
  fields: PlatformFieldDefinition[];
  mediaRules: {
    minCount: number;
    maxCount: number;
    allowImage: boolean;
    allowVideo: boolean;
    maxDurationSec?: number;
  };
}

export interface ComposeValidationIssue {
  field?: string;
  code?: string;
  message: string;
}

export interface ComposeValidationTargetResult {
  providerKey: string;
  valid: boolean;
  issues: ComposeValidationIssue[];
}

export interface ComposeValidationResult {
  ok: boolean;
  targets: ComposeValidationTargetResult[];
}

export interface CreateSocialPostTargetInput {
  providerKey: string;
  integrationResourceId?: string;
  postType?: string;
  platformPayload?: Record<string, unknown>;
}

export interface CreateSocialPostInput {
  caption: string;
  timezone?: string;
  category?: string;
  tags?: string[];
  mediaFileAssetIds?: string[];
  targets: CreateSocialPostTargetInput[];
}

export interface SocialComment {
  id: string;
  externalCommentId: string;
  message: string;
  fromName: string | null;
  createdTime: string | null;
  likeCount: number;
  isRead: boolean;
  providerKey: string;
  externalPostId: string;
  socialPostTargetId: string;
  permalink: string | null;
  replies: SocialComment[];
}

export interface SocialEngagementPostGroup {
  socialPostId: string;
  socialPostTargetId: string;
  providerKey: string;
  externalPostId: string;
  permalink: string | null;
  resourceName: string | null;
  captionPreview: string;
  publishedAt: string | null;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  } | null;
  capabilities: {
    reply: boolean;
    likeComment: boolean;
    deleteComment: boolean;
  };
  comments: SocialComment[];
}

export interface SocialEngagementListResult {
  items: SocialEngagementPostGroup[];
  totalComments: number;
  unreadCount: number;
  warnings: string[];
}

export type SocialEngagementFilters = {
  providerKey?: string;
  socialPostId?: string;
  unreadOnly?: boolean;
  search?: string;
  refresh?: boolean;
};
