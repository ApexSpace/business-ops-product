import type {
  SocialPublishInput,
  SocialPublishValidationIssue,
  SocialPublishValidationResult,
} from '../social-publish-adapter.interface';
import { validateAgainstPlatformSchema } from '../../utils/social-publish-validation.util';
import {
  PINTEREST_ALT_TEXT_MAX_LENGTH,
  PINTEREST_DESCRIPTION_MAX_LENGTH,
  PINTEREST_IMAGE_MAX_BYTES,
  PINTEREST_IMAGE_MIME_ALLOWLIST,
  PINTEREST_TITLE_MAX_LENGTH,
  PINTEREST_VIDEO_MAX_BYTES,
  PINTEREST_VIDEO_MAX_DURATION_SEC,
  PINTEREST_VIDEO_MIN_DURATION_SEC,
  PINTEREST_VIDEO_MIME_ALLOWLIST,
} from './pinterest.constants';

/**
 * Compose + publish validation for Pinterest pins.
 * Step 1: platform schema. Step 2: provider-specific rules.
 */
export function validatePinterestPublishInput(
  input: SocialPublishInput,
): SocialPublishValidationResult {
  const base = validateAgainstPlatformSchema(input);
  const issues: SocialPublishValidationIssue[] = [...base.issues];
  const payload = input.platformPayload ?? {};

  const boardId =
    (typeof payload.boardId === 'string' ? payload.boardId.trim() : '') ||
    input.externalResourceId?.trim() ||
    '';
  if (!boardId) {
    const integrationResourceId = input.metadata?.integrationResourceId;
    const hasDestination =
      typeof integrationResourceId === 'string' &&
      integrationResourceId.trim().length > 0;
    if (!hasDestination) {
      issues.push({
        field: 'externalResourceId',
        message:
          'Select a Pinterest board under Destinations (sync boards in Settings → Integrations if none appear).',
      });
    }
  }

  const title =
    typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) {
    issues.push({
      field: 'title',
      message: 'Title is required for Pinterest pins.',
    });
  } else if (title.length > PINTEREST_TITLE_MAX_LENGTH) {
    issues.push({
      field: 'title',
      message: `Pinterest title must be at most ${PINTEREST_TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (input.caption.length > PINTEREST_DESCRIPTION_MAX_LENGTH) {
    issues.push({
      field: 'caption',
      message: `Pinterest description must be at most ${PINTEREST_DESCRIPTION_MAX_LENGTH} characters.`,
    });
  }

  const link =
    typeof payload.link === 'string' ? payload.link.trim() : '';
  if (link) {
    try {
      const parsed = new URL(link);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        issues.push({
          field: 'link',
          message: 'Destination link must be an http(s) URL.',
        });
      }
    } catch {
      issues.push({
        field: 'link',
        message: 'Destination link must be a valid URL.',
      });
    }
  }

  const altText =
    typeof payload.altText === 'string' ? payload.altText.trim() : '';
  if (altText.length > PINTEREST_ALT_TEXT_MAX_LENGTH) {
    issues.push({
      field: 'altText',
      message: `Alt text must be at most ${PINTEREST_ALT_TEXT_MAX_LENGTH} characters.`,
    });
  }

  const media = input.media[0];
  if (!media) {
    issues.push({
      field: 'media',
      message: 'Pinterest publish requires exactly one image or video.',
    });
  } else {
    const mime = media.mimeType.toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!isImage && !isVideo) {
      issues.push({
        field: 'media',
        message: 'Pinterest only accepts image or video files.',
      });
    } else if (isImage) {
      if (mime !== 'image/*' && !PINTEREST_IMAGE_MIME_ALLOWLIST.has(mime)) {
        issues.push({
          field: 'media',
          message: 'Pinterest images should be JPEG, PNG, or WebP.',
        });
      }
      if (
        media.sizeBytes !== undefined &&
        media.sizeBytes > PINTEREST_IMAGE_MAX_BYTES
      ) {
        issues.push({
          field: 'media',
          message: 'Pinterest images must be at most 10 MB.',
        });
      }
    } else if (isVideo) {
      if (mime !== 'video/*' && !PINTEREST_VIDEO_MIME_ALLOWLIST.has(mime)) {
        issues.push({
          field: 'media',
          message: 'Pinterest videos should be MP4, MOV, or WebM.',
        });
      }
      if (
        media.sizeBytes !== undefined &&
        media.sizeBytes > PINTEREST_VIDEO_MAX_BYTES
      ) {
        issues.push({
          field: 'media',
          message: 'Pinterest videos must be at most 1 GB.',
        });
      }
      if (
        media.durationSec !== undefined &&
        media.durationSec < PINTEREST_VIDEO_MIN_DURATION_SEC
      ) {
        issues.push({
          field: 'media',
          message: `Pinterest videos must be at least ${PINTEREST_VIDEO_MIN_DURATION_SEC} seconds.`,
        });
      }
      if (
        media.durationSec !== undefined &&
        media.durationSec > PINTEREST_VIDEO_MAX_DURATION_SEC
      ) {
        issues.push({
          field: 'media',
          message: `Pinterest videos must be at most ${PINTEREST_VIDEO_MAX_DURATION_SEC} seconds.`,
        });
      }
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
