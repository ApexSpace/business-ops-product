import { Injectable } from '@nestjs/common';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

const PINTEREST_PINS_URL = 'https://api.pinterest.com/v5/pins';

interface PinterestPinResponse {
  id?: string;
  message?: string;
}

@Injectable()
export class PinterestPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'pinterest';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    const platformPayload = {
      ...input.platformPayload,
      boardId:
        (input.platformPayload.boardId as string | undefined) ||
        input.externalResourceId,
    };
    return validateAgainstPlatformSchema({ ...input, platformPayload });
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const media = input.media[0];
    if (!media) {
      throw new Error('Pinterest publish requires an image');
    }

    const boardId =
      (input.platformPayload.boardId as string | undefined) ||
      input.externalResourceId;
    if (!boardId) {
      throw new Error('Pinterest publish requires a boardId');
    }

    const body = {
      board_id: boardId,
      title: input.platformPayload.title as string | undefined,
      description: input.caption,
      link: input.platformPayload.link as string | undefined,
      media_source: {
        source_type: 'image_url',
        url: media.url,
      },
    };

    const response = await fetch(PINTEREST_PINS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as PinterestPinResponse;
    if (!response.ok || !data.id) {
      throw new Error(
        `Pinterest publish failed: ${data.message ?? response.statusText}`,
      );
    }

    return {
      externalPostId: data.id,
      permalink: `https://www.pinterest.com/pin/${data.id}/`,
      raw: data,
    };
  }
}
