import { Injectable } from '@nestjs/common';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

const TIKTOK_PUBLISH_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/video/init/';

interface TikTokInitResponse {
  data?: { publish_id?: string };
  error?: { code?: string; message?: string };
}

/**
 * Content Posting API — PULL_FROM_URL source. TikTok processes the video
 * asynchronously after init; publish_id is the tracking handle until a
 * status poller resolves the final video id (not implemented here).
 */
@Injectable()
export class TikTokPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'tiktok';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const media = input.media[0];
    if (!media) {
      throw new Error('TikTok publish requires a video file');
    }

    const privacyLevel = input.platformPayload.privacyLevel as
      | string
      | undefined;
    if (!privacyLevel) {
      throw new Error('TikTok publish requires a privacyLevel');
    }

    const body = {
      post_info: {
        title: input.caption,
        privacy_level: privacyLevel,
        disable_duet: Boolean(input.platformPayload.disableDuet),
        disable_comment: Boolean(input.platformPayload.disableComment),
        disable_stitch: Boolean(input.platformPayload.disableStitch),
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: media.url,
      },
    };

    const response = await fetch(TIKTOK_PUBLISH_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as TikTokInitResponse;
    if (!response.ok || !data.data?.publish_id) {
      throw new Error(
        `TikTok publish failed: ${data.error?.message ?? response.statusText}`,
      );
    }

    return {
      externalPostId: data.data.publish_id,
      raw: data,
    };
  }
}
