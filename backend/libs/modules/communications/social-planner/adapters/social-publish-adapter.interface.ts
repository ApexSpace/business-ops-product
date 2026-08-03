export interface SocialPublishMediaInput {
  url: string;
  mimeType: string;
  fileAssetId: string;
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
