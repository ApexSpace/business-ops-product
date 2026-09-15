import { Injectable } from '@nestjs/common';
import { getMetaGraphBaseUrl } from '@app/modules/integrations/integrations/meta/constants/meta-oauth.constants';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

interface GraphContainerResponse {
  id?: string;
  error?: { message?: string };
}

@Injectable()
export class InstagramPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'instagram';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const igUserId = input.externalResourceId;
    const base = getMetaGraphBaseUrl();

    const containerId =
      input.media.length > 1
        ? await this.createCarouselContainer(base, igUserId, input)
        : await this.createSingleMediaContainer(base, igUserId, input);

    const publishData = await this.post(`${base}/${igUserId}/media_publish`, {
      creation_id: containerId,
      access_token: input.accessToken,
    });

    const mediaId = publishData.id!;
    const permalink = await this.fetchPermalink(
      base,
      mediaId,
      input.accessToken,
    );

    return {
      externalPostId: mediaId,
      permalink:
        permalink ?? `https://www.instagram.com/p/${mediaId}/`,
      raw: publishData,
    };
  }

  /** IG Media permalink is a shortcode URL — numeric Graph ids are not valid /p/ paths. */
  private async fetchPermalink(
    base: string,
    mediaId: string,
    accessToken: string,
  ): Promise<string | null> {
    const url = new URL(`${base}/${mediaId}`);
    url.searchParams.set('fields', 'permalink');
    url.searchParams.set('access_token', accessToken);
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const data = (await response.json()) as {
      permalink?: string;
      error?: { message?: string };
    };
    return data.permalink?.trim() || null;
  }

  private async createSingleMediaContainer(
    base: string,
    igUserId: string,
    input: SocialPublishInput,
  ): Promise<string> {
    const media = input.media[0];
    const isVideo = media?.mimeType.toLowerCase().startsWith('video/');
    const isStory = input.postType === 'STORY';

    const body: Record<string, string> = {
      caption: input.caption,
      access_token: input.accessToken,
    };

    if (isVideo) {
      body.video_url = media.url;
      body.media_type = isStory ? 'STORIES' : 'REELS';
    } else if (media) {
      body.image_url = media.url;
      if (isStory) body.media_type = 'STORIES';
    }

    const data = await this.post(`${base}/${igUserId}/media`, body);
    return data.id!;
  }

  private async createCarouselContainer(
    base: string,
    igUserId: string,
    input: SocialPublishInput,
  ): Promise<string> {
    const childIds: string[] = [];
    for (const media of input.media) {
      const isVideo = media.mimeType.toLowerCase().startsWith('video/');
      const child = await this.post(`${base}/${igUserId}/media`, {
        is_carousel_item: 'true',
        access_token: input.accessToken,
        ...(isVideo ? { video_url: media.url } : { image_url: media.url }),
      });
      childIds.push(child.id!);
    }

    const container = await this.post(`${base}/${igUserId}/media`, {
      media_type: 'CAROUSEL',
      caption: input.caption,
      children: childIds.join(','),
      access_token: input.accessToken,
    });
    return container.id!;
  }

  private async post(
    url: string,
    body: Record<string, string>,
  ): Promise<GraphContainerResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    const data = (await response.json()) as GraphContainerResponse;
    if (!response.ok || !data.id) {
      throw new Error(
        `Instagram publish failed: ${data.error?.message ?? response.statusText}`,
      );
    }
    return data;
  }
}
