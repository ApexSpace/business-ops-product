import type {
  SocialPublishInput,
  SocialPublishValidationIssue,
  SocialPublishValidationResult,
} from '../social-publish-adapter.interface';
import { validateAgainstPlatformSchema } from '../../utils/social-publish-validation.util';

const PRIVACY_LEVELS = new Set([
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
]);

/**
 * Compose + publish validation for TikTok Content Posting rules
 * (schema structure + commercial disclosure + privacy constraints).
 */
export function validateTikTokPublishInput(
  input: SocialPublishInput,
  options?: {
    privacyLevelOptions?: string[];
    maxDurationSec?: number;
    commentDisabled?: boolean;
    duetDisabled?: boolean;
    stitchDisabled?: boolean;
  },
): SocialPublishValidationResult {
  const base = validateAgainstPlatformSchema(input);
  const issues: SocialPublishValidationIssue[] = [...base.issues];
  const payload = input.platformPayload ?? {};

  const privacyLevel =
    typeof payload.privacyLevel === 'string' ? payload.privacyLevel : '';

  if (!privacyLevel) {
    issues.push({
      field: 'privacyLevel',
      message: 'Privacy level is required for TikTok.',
    });
  } else if (!PRIVACY_LEVELS.has(privacyLevel)) {
    issues.push({
      field: 'privacyLevel',
      message: `Invalid TikTok privacy level "${privacyLevel}".`,
    });
  } else if (
    options?.privacyLevelOptions &&
    options.privacyLevelOptions.length > 0 &&
    !options.privacyLevelOptions.includes(privacyLevel)
  ) {
    issues.push({
      field: 'privacyLevel',
      message:
        'Selected privacy level is not available for this TikTok account.',
    });
  }

  const commercialDisclosure = Boolean(payload.commercialDisclosure);
  const brandOrganic = Boolean(payload.brandOrganic);
  const brandedContent = Boolean(payload.brandedContent);

  if (commercialDisclosure && !brandOrganic && !brandedContent) {
    issues.push({
      field: 'commercialDisclosure',
      message:
        'Indicate whether your content promotes yourself, a third party, or both.',
    });
  }

  if (brandedContent && privacyLevel === 'SELF_ONLY') {
    issues.push({
      field: 'brandedContent',
      message: 'Branded content visibility cannot be set to Only me.',
    });
  }

  if (options?.commentDisabled && payload.disableComment === false) {
    // Creator already disables comments globally — still ok to send true
  }
  if (options?.duetDisabled && payload.disableDuet === false) {
    // same
  }
  if (options?.stitchDisabled && payload.disableStitch === false) {
    // same
  }

  const maxDuration =
    options?.maxDurationSec ??
    (typeof payload._maxDurationSec === 'number'
      ? payload._maxDurationSec
      : undefined);
  const media = input.media[0];
  if (
    maxDuration !== undefined &&
    media?.durationSec !== undefined &&
    media.durationSec > maxDuration
  ) {
    issues.push({
      field: 'media',
      message: `TikTok video must be at most ${maxDuration} seconds.`,
    });
  }

  // Deduplicate by message+field
  const seen = new Set<string>();
  const deduped = issues.filter((issue) => {
    const key = `${issue.field ?? ''}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { valid: deduped.length === 0, issues: deduped };
}

export function buildTikTokPostInfo(
  input: SocialPublishInput,
): Record<string, unknown> {
  const payload = input.platformPayload ?? {};
  const privacyLevel = String(payload.privacyLevel);
  const commercialDisclosure = Boolean(payload.commercialDisclosure);
  const brandOrganic = Boolean(payload.brandOrganic);
  const brandedContent = Boolean(payload.brandedContent);

  return {
    title: input.caption,
    privacy_level: privacyLevel,
    disable_duet: Boolean(payload.disableDuet),
    disable_comment: Boolean(payload.disableComment),
    disable_stitch: Boolean(payload.disableStitch),
    video_cover_timestamp_ms: 1000,
    // Always send commercial toggles (false when disclosure is off) — required by Content Posting UX rules.
    brand_organic_toggle: commercialDisclosure ? brandOrganic : false,
    brand_content_toggle: commercialDisclosure ? brandedContent : false,
  };
}
