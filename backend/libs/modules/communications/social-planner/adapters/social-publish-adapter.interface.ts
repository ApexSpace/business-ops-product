export interface SocialPublishMediaInput {
  url: string;
  mimeType: string;
  fileAssetId: string;
  /** R2 object key — used for FILE_UPLOAD / byte fetch when pull URL is unsuitable. */
  objectKey?: string;
  /** Byte size when known (FILE_UPLOAD chunking). */
  sizeBytes?: number;
  /** Whether `url` is a stable public CDN URL (vs short-lived signed). */
  isPublicUrl?: boolean;
  /** Duration in seconds when known from file metadata. */
  durationSec?: number;
}

export interface SocialPublishInput {
  businessId: string;
  providerKey: string;
  postType: string;
  caption: string;
  platformPayload: Record<string, unknown>;
  media: SocialPublishMediaInput[];
  accessToken: string;
  /** Page / channel / user / board id the post publishes to. */
  externalResourceId: string;
  metadata?: Record<string, unknown>;
}

export interface SocialPublishValidationIssue {
  field?: string;
  message: string;
}

export interface SocialPublishValidationResult {
  valid: boolean;
  issues: SocialPublishValidationIssue[];
}

export interface SocialPublishResult {
  externalPostId: string;
  permalink?: string;
  raw?: unknown;
}

export interface SocialPublishAdapter {
  readonly providerKey: string;
  validate(input: SocialPublishInput): SocialPublishValidationResult;
  publish(input: SocialPublishInput): Promise<SocialPublishResult>;
}
