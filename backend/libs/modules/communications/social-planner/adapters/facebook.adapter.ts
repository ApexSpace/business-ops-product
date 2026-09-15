import { Injectable } from '@nestjs/common';
import { getMetaGraphBaseUrl } from '@app/modules/integrations/integrations/meta/constants/meta-oauth.constants';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

interface GraphIdResponse {
  id?: string;
  post_id?: string;
  error?: { message?: string };
}

@Injectable()
export class FacebookPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'facebook';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const pageId = input.externalResourceId;
    const base = getMetaGraphBaseUrl();

    if (input.media.length === 0) {
      const data = await this.post(`${base}/${pageId}/feed`, {
        message: input.caption,
        access_token: input.accessToken,
      });
      const id = data.post_id ?? data.id;
      return {
        externalPostId: id!,
        permalink: `https://www.facebook.com/${pageId}/posts/${id}`,
        raw: data,
      };
    }

    if (input.media.length === 1) {
      const media = input.media[0];
      if (media.mimeType.toLowerCase().startsWith('video/')) {
        const data = await this.post(`${base}/${pageId}/videos`, {
          file_url: media.url,
          description: input.caption,
          access_token: input.accessToken,
        });
        return {
          externalPostId: data.id!,
          permalink: `https://www.facebook.com/${pageId}/videos/${data.id}`,
          raw: data,
        };
      }

      const data = await this.post(`${base}/${pageId}/photos`, {
        url: media.url,
        caption: input.caption,
        access_token: input.accessToken,
      });
      return {
        externalPostId: data.post_id ?? data.id!,
        permalink: `https://www.facebook.com/${pageId}/photos/${data.id}`,
        raw: data,
      };
    }

    const attachedMedia: Array<{ media_fbid: string }> = [];
    for (const media of input.media) {
      const uploaded = await this.post(`${base}/${pageId}/photos`, {
        url: media.url,
        published: 'false',
        access_token: input.accessToken,
      });
      attachedMedia.push({ media_fbid: uploaded.id! });
    }

    const data = await this.post(`${base}/${pageId}/feed`, {
      message: input.caption,
      attached_media: JSON.stringify(attachedMedia),
      access_token: input.accessToken,
    });
    const id = data.post_id ?? data.id;
    return {
      externalPostId: id!,
      permalink: `https://www.facebook.com/${pageId}/posts/${id}`,
      raw: data,
    };
  }

  private async post(
    url: string,
    body: Record<string, string>,
  ): Promise<GraphIdResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    const data = (await response.json()) as GraphIdResponse;
    if (!response.ok || !(data.id || data.post_id)) {
      throw new Error(
        `Facebook publish failed: ${data.error?.message ?? response.statusText}`,
      );
    }
    return data;
  }
}
