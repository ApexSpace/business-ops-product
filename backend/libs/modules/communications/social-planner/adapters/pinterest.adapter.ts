import { Injectable } from '@nestjs/common';
import {
  pinterestCreateImagePin,
  pinterestCreateVideoPin,
  pinterestRegisterVideoUpload,
  pinterestUploadVideoFile,
  pinterestWaitForMediaReady,
} from './pinterest/pinterest-api.client';
import {
  PINTEREST_DESCRIPTION_MAX_LENGTH,
  PINTEREST_TITLE_MAX_LENGTH,
} from './pinterest/pinterest.constants';
import { validatePinterestPublishInput } from './pinterest/pinterest-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

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
    return validatePinterestPublishInput({ ...input, platformPayload });
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const media = input.media[0];
    if (!media) {
      throw new Error('Pinterest publish requires an image or video');
    }

    const boardId =
      (input.platformPayload.boardId as string | undefined) ||
      input.externalResourceId;
    if (!boardId) {
      throw new Error('Pinterest publish requires a boardId');
    }

    const title = (
      (typeof input.platformPayload.title === 'string'
        ? input.platformPayload.title.trim()
        : '') ||
      input.caption.slice(0, PINTEREST_TITLE_MAX_LENGTH) ||
      'Untitled pin'
    ).slice(0, PINTEREST_TITLE_MAX_LENGTH);

    const description = input.caption.slice(0, PINTEREST_DESCRIPTION_MAX_LENGTH);
    const link =
      typeof input.platformPayload.link === 'string'
        ? input.platformPayload.link.trim() || undefined
        : undefined;
    const altText =
      typeof input.platformPayload.altText === 'string'
        ? input.platformPayload.altText.trim() || undefined
        : undefined;

    const mime = media.mimeType.toLowerCase();
    const isVideo = mime.startsWith('video/');

    if (isVideo) {
      return this.publishVideoPin({
        input,
        boardId,
        title,
        description,
        link,
        altText,
        media,
      });
    }

    if (!media.url) {
      throw new Error(
        'Pinterest image publish requires a publicly reachable media URL',
      );
    }

    const created = await pinterestCreateImagePin({
      accessToken: input.accessToken,
      boardId,
      title,
      description,
      link,
      altText,
      imageUrl: media.url,
    });

    return {
      externalPostId: created.id,
      permalink: `https://www.pinterest.com/pin/${created.id}/`,
      raw: created.raw,
    };
  }

  private async publishVideoPin(params: {
    input: SocialPublishInput;
    boardId: string;
    title: string;
    description: string;
    link?: string;
    altText?: string;
    media: SocialPublishInput['media'][number];
  }): Promise<SocialPublishResult> {
    const { input, boardId, title, description, link, altText, media } =
      params;

    const registered = await pinterestRegisterVideoUpload(input.accessToken);

    const fileBuffer = await this.downloadMediaBuffer(media.url);
    const fileName =
      media.objectKey?.split('/').pop() ||
      `pinterest-video-${Date.now()}.mp4`;

    await pinterestUploadVideoFile({
      uploadUrl: registered.uploadUrl,
      uploadParameters: registered.uploadParameters,
      fileBuffer,
      fileName,
      mimeType: media.mimeType,
    });

    await pinterestWaitForMediaReady({
      accessToken: input.accessToken,
      mediaId: registered.mediaId,
    });

    const created = await pinterestCreateVideoPin({
      accessToken: input.accessToken,
      boardId,
      title,
      description,
      link,
      altText,
      mediaId: registered.mediaId,
    });

    return {
      externalPostId: created.id,
      permalink: `https://www.pinterest.com/pin/${created.id}/`,
      raw: created.raw,
    };
  }

  private async downloadMediaBuffer(url: string): Promise<Buffer> {
    if (!url) {
      throw new Error('Pinterest video publish requires a downloadable media URL');
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download media for Pinterest upload (${response.status})`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
