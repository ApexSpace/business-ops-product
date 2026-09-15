import type {
  SocialPublishInput,
  SocialPublishValidationIssue,
  SocialPublishValidationResult,
} from '../social-publish-adapter.interface';
import { validateAgainstPlatformSchema } from '../../utils/social-publish-validation.util';
import {
  YOUTUBE_DEFAULT_MAX_DURATION_SEC,
  YOUTUBE_DESCRIPTION_MAX_LENGTH,
  YOUTUBE_FALLBACK_CATEGORIES,
  YOUTUBE_MAX_FILE_BYTES,
  YOUTUBE_PRIVACY_STATUSES,
  YOUTUBE_SHORTS_MAX_DURATION_SEC,
  YOUTUBE_TITLE_MAX_LENGTH,
  YOUTUBE_VIDEO_MIME_ALLOWLIST,
} from './youtube.constants';

const FALLBACK_CATEGORY_IDS = new Set(
  YOUTUBE_FALLBACK_CATEGORIES.map((c) => c.id),
);

/**
 * Compose + publish validation for YouTube Data API uploads.
 */
export function validateYouTubePublishInput(
  input: SocialPublishInput,
  options?: {
    allowedCategoryIds?: string[];
    maxDurationSec?: number;
    maxFileBytes?: number;
  },
): SocialPublishValidationResult {
  const base = validateAgainstPlatformSchema(input);
  const issues: SocialPublishValidationIssue[] = [...base.issues];
  const payload = input.platformPayload ?? {};

  const title =
    typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) {
    issues.push({
      field: 'title',
      message: 'Title is required for YouTube.',
    });
  } else if (title.length > YOUTUBE_TITLE_MAX_LENGTH) {
    issues.push({
      field: 'title',
      message: `YouTube title must be at most ${YOUTUBE_TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (input.caption.length > YOUTUBE_DESCRIPTION_MAX_LENGTH) {
    issues.push({
      field: 'caption',
      message: `YouTube description must be at most ${YOUTUBE_DESCRIPTION_MAX_LENGTH} characters.`,
    });
  }

  const privacyRaw =
    typeof payload.privacyStatus === 'string'
      ? payload.privacyStatus.trim().toLowerCase()
      : 'public';
  if (
    !YOUTUBE_PRIVACY_STATUSES.includes(
      privacyRaw as (typeof YOUTUBE_PRIVACY_STATUSES)[number],
    )
  ) {
    issues.push({
      field: 'privacyStatus',
      message: `Invalid YouTube privacy "${privacyRaw}".`,
    });
  }

  if (
    payload.madeForKids === undefined ||
    payload.madeForKids === null ||
    typeof payload.madeForKids !== 'boolean'
  ) {
    issues.push({
      field: 'madeForKids',
      message:
        'You must declare whether this video is made for kids (COPPA / YouTube requirement).',
    });
  }

  const categoryId =
    typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
  if (categoryId) {
    const allowed =
      options?.allowedCategoryIds && options.allowedCategoryIds.length > 0
        ? new Set(options.allowedCategoryIds)
        : FALLBACK_CATEGORY_IDS;
    if (!allowed.has(categoryId)) {
      issues.push({
        field: 'categoryId',
        message: `Invalid YouTube category "${categoryId}".`,
      });
    }
  }

  if (!input.externalResourceId?.trim()) {
    const integrationResourceId = input.metadata?.integrationResourceId;
    const hasDestination =
      typeof integrationResourceId === 'string' &&
      integrationResourceId.trim().length > 0;
    if (!hasDestination) {
      issues.push({
        field: 'externalResourceId',
        message:
          'Select a YouTube channel under Destinations (connect one in Settings → Integrations if none appear).',
      });
    }
  }

  const media = input.media[0];
  if (!media) {
    issues.push({
      field: 'media',
      message: 'YouTube publish requires exactly one video file.',
    });
  } else {
    const mime = media.mimeType.toLowerCase();
    if (!mime.startsWith('video/')) {
      issues.push({
        field: 'media',
        message: 'YouTube only accepts video files.',
      });
    } else if (
      mime !== 'video/*' &&
      !YOUTUBE_VIDEO_MIME_ALLOWLIST.has(mime)
    ) {
      issues.push({
        field: 'media',
        message:
          'YouTube video should be MP4, MOV, WebM, AVI, or MPEG for reliable upload.',
      });
    }

    const maxBytes = options?.maxFileBytes ?? YOUTUBE_MAX_FILE_BYTES;
    if (media.sizeBytes !== undefined && media.sizeBytes > maxBytes) {
      issues.push({
        field: 'media',
        message: `YouTube video must be at most ${Math.round(maxBytes / (1024 * 1024))} MB for this publisher.`,
      });
    }

    const isShort = input.postType === 'SHORT';
    const maxDuration =
      options?.maxDurationSec ??
      (isShort
        ? YOUTUBE_SHORTS_MAX_DURATION_SEC
        : YOUTUBE_DEFAULT_MAX_DURATION_SEC);
    if (
      media.durationSec !== undefined &&
      media.durationSec > maxDuration
    ) {
      issues.push({
        field: 'media',
        message: isShort
          ? `YouTube Shorts must be at most ${YOUTUBE_SHORTS_MAX_DURATION_SEC} seconds.`
          : `YouTube video must be at most ${maxDuration} seconds.`,
      });
    }
  }

  const seen = new Set<string>();
  const deduped = issues.filter((issue) => {
    const key = `${issue.field ?? ''}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { valid: deduped.length === 0, issues: deduped };
}

export function buildYouTubeSnippetAndStatus(input: SocialPublishInput): {
  snippet: Record<string, unknown>;
  status: Record<string, unknown>;
} {
  const payload = input.platformPayload ?? {};
  const title =
    (typeof payload.title === 'string' ? payload.title.trim() : '') ||
    input.caption.slice(0, YOUTUBE_TITLE_MAX_LENGTH) ||
    'Untitled video';
  const privacyStatus =
    typeof payload.privacyStatus === 'string'
      ? payload.privacyStatus.trim().toLowerCase()
      : 'public';
  const categoryId =
    typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
  const tags =
    typeof payload.tags === 'string'
      ? payload.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 15)
      : Array.isArray(payload.tags)
        ? (payload.tags as unknown[])
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 15)
        : undefined;

  let description = input.caption;
  if (input.postType === 'SHORT' && !/#shorts/i.test(description)) {
    description = `${description}\n\n#Shorts`.trim();
  }

  return {
    snippet: {
      title: title.slice(0, YOUTUBE_TITLE_MAX_LENGTH),
      description: description.slice(0, YOUTUBE_DESCRIPTION_MAX_LENGTH),
      ...(categoryId ? { categoryId } : { categoryId: '22' }),
      ...(tags && tags.length > 0 ? { tags } : {}),
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: Boolean(payload.madeForKids),
    },
  };
}
