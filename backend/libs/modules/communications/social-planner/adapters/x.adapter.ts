import { Injectable } from '@nestjs/common';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

const X_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';
const X_TWEETS_URL = 'https://api.twitter.com/2/tweets';

interface XMediaUploadResponse {
  media_id_string?: string;
  errors?: Array<{ message?: string }>;
}

interface XTweetResponse {
  data?: { id?: string; text?: string };
  errors?: Array<{ message?: string }>;
}

@Injectable()
export class XPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'x';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const mediaIds: string[] = [];
    for (const media of input.media) {
      mediaIds.push(await this.uploadMedia(media.url, input.accessToken));
    }

    const response = await fetch(X_TWEETS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: input.caption,
        ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
      }),
    });

    const data = (await response.json()) as XTweetResponse;
    if (!response.ok || !data.data?.id) {
      throw new Error(
        `X publish failed: ${data.errors?.[0]?.message ?? response.statusText}`,
      );
    }

    return {
      externalPostId: data.data.id,
      permalink: `https://x.com/i/web/status/${data.data.id}`,
      raw: data,
    };
  }

  private async uploadMedia(
    mediaUrl: string,
    accessToken: string,
  ): Promise<string> {
    const bytes = await fetch(mediaUrl).then((res) => res.arrayBuffer());
    const form = new FormData();
    form.append('media', new Blob([bytes]));

    const response = await fetch(X_MEDIA_UPLOAD_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    const data = (await response.json()) as XMediaUploadResponse;
    if (!response.ok || !data.media_id_string) {
      throw new Error(
        `X media upload failed: ${data.errors?.[0]?.message ?? response.statusText}`,
      );
    }
    return data.media_id_string;
  }
}
