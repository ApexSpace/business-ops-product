import {
  getPlatformSchema,
  PlatformSchemaDefinition,
} from '../platform-schemas/platform-schema.registry';
import type {
  SocialPublishInput,
  SocialPublishValidationIssue,
  SocialPublishValidationResult,
} from '../adapters/social-publish-adapter.interface';

function isImageMime(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('image/');
}

function isVideoMime(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('video/');
}

/**
 * Shared structural validation against the platform schema registry:
 * caption length, post type membership, required fields, and media rules.
 * Adapters call this first, then layer on provider-specific checks.
 */
export function validateAgainstPlatformSchema(
  input: SocialPublishInput,
): SocialPublishValidationResult {
  const issues: SocialPublishValidationIssue[] = [];
  const schema = getPlatformSchema(input.providerKey);

  if (!schema) {
    return {
      valid: false,
      issues: [{ message: `Unsupported provider: ${input.providerKey}` }],
    };
  }

  validateCaption(schema, input, issues);
  validatePostType(schema, input, issues);
  validateFields(schema, input, issues);
  validateMedia(schema, input, issues);

  return { valid: issues.length === 0, issues };
}

function validateCaption(
  schema: PlatformSchemaDefinition,
  input: SocialPublishInput,
  issues: SocialPublishValidationIssue[],
): void {
  if (input.caption.length > schema.captionMaxLength) {
    issues.push({
      field: 'caption',
      message: `Caption exceeds ${schema.captionMaxLength} characters for ${schema.displayName}.`,
    });
  }
}

function validatePostType(
  schema: PlatformSchemaDefinition,
  input: SocialPublishInput,
  issues: SocialPublishValidationIssue[],
): void {
  if (!schema.postTypes.some((t) => t.key === input.postType)) {
    issues.push({
      field: 'postType',
      message: `Unsupported post type "${input.postType}" for ${schema.displayName}.`,
    });
  }
}

function validateFields(
  schema: PlatformSchemaDefinition,
  input: SocialPublishInput,
  issues: SocialPublishValidationIssue[],
): void {
  for (const field of schema.fields) {
    const value = input.platformPayload?.[field.key];
    if (
      field.required &&
      (value === undefined || value === null || value === '')
    ) {
      issues.push({
        field: field.key,
        message: `${field.label} is required for ${schema.displayName}.`,
      });
      continue;
    }

    if (
      field.type === 'select' &&
      value !== undefined &&
      value !== null &&
      value !== '' &&
      field.options &&
      !field.options.some((o) => o.value === value)
    ) {
      issues.push({
        field: field.key,
        message: `Invalid value for ${field.label}.`,
      });
    }
  }
}

function validateMedia(
  schema: PlatformSchemaDefinition,
  input: SocialPublishInput,
  issues: SocialPublishValidationIssue[],
): void {
  const { mediaRules } = schema;
  const count = input.media.length;

  if (count < mediaRules.minCount) {
    issues.push({
      field: 'media',
      message: `${schema.displayName} requires at least ${mediaRules.minCount} media item(s).`,
    });
  }

  if (count > mediaRules.maxCount) {
    issues.push({
      field: 'media',
      message: `${schema.displayName} allows at most ${mediaRules.maxCount} media item(s).`,
    });
  }

  for (const item of input.media) {
    if (isImageMime(item.mimeType) && !mediaRules.allowImage) {
      issues.push({
        field: 'media',
        message: `${schema.displayName} does not support image media for this post type.`,
      });
    } else if (isVideoMime(item.mimeType) && !mediaRules.allowVideo) {
      issues.push({
        field: 'media',
        message: `${schema.displayName} does not support video media for this post type.`,
      });
    } else if (!isImageMime(item.mimeType) && !isVideoMime(item.mimeType)) {
      issues.push({
        field: 'media',
        message: `Unsupported media type "${item.mimeType}" for ${schema.displayName}.`,
      });
    }
  }
}
