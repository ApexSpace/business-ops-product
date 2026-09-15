import { Injectable } from '@nestjs/common';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

const GBP_BASE_URL = 'https://mybusiness.googleapis.com/v4';

interface GbpLocalPostResponse {
  name?: string;
  searchUrl?: string;
  error?: { message?: string };
}

/** Google Business Profile — location name format: accounts/{accountId}/locations/{locationId}. */
@Injectable()
export class GoogleBusinessProfilePublishAdapter
  implements SocialPublishAdapter
{
  readonly providerKey = 'google-business-profile';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const locationName = input.externalResourceId;
    const ctaType = input.platformPayload.ctaType as string | undefined;
    const ctaUrl = input.platformPayload.ctaUrl as string | undefined;

    const body: Record<string, unknown> = {
      languageCode: 'en',
      summary: input.caption,
      topicType: input.postType === 'STANDARD' ? 'STANDARD' : input.postType,
    };

    if (ctaType) {
      body.callToAction = {
        actionType: ctaType,
        ...(ctaUrl ? { url: ctaUrl } : {}),
      };
    }

    if (input.media.length > 0) {
      body.media = input.media.map((media) => ({
        mediaFormat: media.mimeType.toLowerCase().startsWith('video/')
          ? 'VIDEO'
          : 'PHOTO',
        sourceUrl: media.url,
      }));
    }

    const response = await fetch(`${GBP_BASE_URL}/${locationName}/localPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as GbpLocalPostResponse;
    if (!response.ok || !data.name) {
      throw new Error(
        `Google Business Profile publish failed: ${data.error?.message ?? response.statusText}`,
      );
    }

    return {
      externalPostId: data.name,
      permalink: data.searchUrl,
      raw: data,
    };
  }
}
