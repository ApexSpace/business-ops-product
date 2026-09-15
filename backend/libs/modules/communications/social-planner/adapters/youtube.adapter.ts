import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@app/modules/storage/services/storage.service';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';
import {
  youtubeAssertChannelAccessible,
  youtubeInitResumableUpload,
  youtubePollUntilProcessed,
  youtubeSetThumbnail,
  youtubeUploadVideoChunks,
} from './youtube/youtube-api.client';
import {
  YOUTUBE_UPLOAD_SESSION_PAYLOAD_KEY,
  YOUTUBE_VIDEO_ID_PAYLOAD_KEY,
  YouTubeApiError,
  isYouTubeQuotaError,
} from './youtube/youtube.constants';
import {
  buildYouTubeSnippetAndStatus,
  validateYouTubePublishInput,
} from './youtube/youtube-validation.util';

type PersistPayload = (patch: Record<string, unknown>) => Promise<void>;

@Injectable()
export class YouTubePublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'youtube';
  private readonly logger = new Logger(YouTubePublishAdapter.name);

  constructor(private readonly storageService: StorageService) {}

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    const payload = input.platformPayload ?? {};
    const allowedCategoryIds = Array.isArray(payload._allowedCategoryIds)
      ? (payload._allowedCategoryIds as string[])
      : undefined;
    return validateYouTubePublishInput(input, { allowedCategoryIds });
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const media = input.media[0];
    if (!media) {
      throw new Error('YouTube publish requires a video file');
    }

    const persist = this.readPersistCallback(input);
    const existingVideoId = this.readResumeVideoId(input);
    if (existingVideoId) {
      this.logger.log(
        `Resuming YouTube processing poll for videoId=${existingVideoId} target=${String(input.metadata?.socialPostTargetId ?? '')}`,
      );
      return this.finishWithProcessingPoll(
        input.accessToken,
        existingVideoId,
        input,
      );
    }

    try {
      if (input.externalResourceId) {
        await youtubeAssertChannelAccessible({
          accessToken: input.accessToken,
          channelId: input.externalResourceId,
        });
      }

      const { snippet, status } = buildYouTubeSnippetAndStatus(input);
      const videoBytes = await this.loadVideoBytes(media);
      const uploadUrl = await youtubeInitResumableUpload({
        accessToken: input.accessToken,
        mimeType: media.mimeType,
        byteSize: videoBytes.byteLength,
        snippet,
        status,
      });

      await persist?.({
        [YOUTUBE_UPLOAD_SESSION_PAYLOAD_KEY]: uploadUrl,
      });

      const uploaded = await youtubeUploadVideoChunks({
        uploadUrl,
        bytes: videoBytes,
        mimeType: media.mimeType,
      });

      await persist?.({
        [YOUTUBE_VIDEO_ID_PAYLOAD_KEY]: uploaded.id,
        [YOUTUBE_UPLOAD_SESSION_PAYLOAD_KEY]: undefined,
      });

      this.logger.log(
        `YouTube upload ok videoId=${uploaded.id} target=${String(input.metadata?.socialPostTargetId ?? '')}`,
      );

      return this.finishWithProcessingPoll(
        input.accessToken,
        uploaded.id,
        input,
        uploaded.raw,
      );
    } catch (error) {
      throw this.rewritePublishError(error);
    }
  }

  private async finishWithProcessingPoll(
    accessToken: string,
    videoId: string,
    input: SocialPublishInput,
    uploadRaw?: unknown,
  ): Promise<SocialPublishResult> {
    const result = await youtubePollUntilProcessed({
      accessToken,
      videoId,
    });
    if (!result.ok) {
      throw new YouTubeApiError(
        result.failReason,
        result.uploadStatus,
      );
    }

    await this.maybeSetThumbnail(accessToken, videoId, input);

    return {
      externalPostId: videoId,
      permalink: `https://youtube.com/watch?v=${videoId}`,
      raw: { upload: uploadRaw, processing: result.raw },
    };
  }

  private async maybeSetThumbnail(
    accessToken: string,
    videoId: string,
    input: SocialPublishInput,
  ): Promise<void> {
    const payload = input.platformPayload ?? {};
    const thumbAssetId =
      typeof payload.thumbnailFileAssetId === 'string'
        ? payload.thumbnailFileAssetId
        : typeof input.metadata?.thumbnailObjectKey === 'string'
          ? null
          : null;
    const thumbObjectKey =
      typeof input.metadata?.thumbnailObjectKey === 'string'
        ? input.metadata.thumbnailObjectKey
        : typeof payload.thumbnailObjectKey === 'string'
          ? payload.thumbnailObjectKey
          : null;
    const thumbMime =
      typeof payload.thumbnailMimeType === 'string'
        ? payload.thumbnailMimeType
        : 'image/jpeg';

    if (!thumbObjectKey && !thumbAssetId) return;
    if (!thumbObjectKey) return;

    try {
      const bytes = await this.storageService.getObjectBytes(thumbObjectKey);
      await youtubeSetThumbnail({
        accessToken,
        videoId,
        bytes: new Uint8Array(bytes),
        mimeType: thumbMime,
      });
    } catch (error) {
      this.logger.warn(
        `YouTube thumbnail upload skipped for videoId=${videoId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async loadVideoBytes(
    media: SocialPublishInput['media'][0],
  ): Promise<Uint8Array> {
    if (media.objectKey) {
      const buf = await this.storageService.getObjectBytes(media.objectKey);
      return new Uint8Array(buf);
    }
    const response = await fetch(media.url);
    if (!response.ok) {
      throw new YouTubeApiError(
        `Failed to download media for YouTube upload (${response.status})`,
        'media_download_failed',
        response.status,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  private readResumeVideoId(input: SocialPublishInput): string | null {
    const value = input.platformPayload?.[YOUTUBE_VIDEO_ID_PAYLOAD_KEY];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readPersistCallback(input: SocialPublishInput): PersistPayload | undefined {
    const cb = input.metadata?.onYouTubePublishProgress;
    return typeof cb === 'function' ? (cb as PersistPayload) : undefined;
  }

  private rewritePublishError(error: unknown): Error {
    if (error instanceof YouTubeApiError) {
      if (isYouTubeQuotaError(error)) {
        return new YouTubeApiError(
          'YouTube API quota exceeded. Try again later or request a higher quota in Google Cloud.',
          error.code,
          error.status,
        );
      }
      return error;
    }
    if (error instanceof Error) return error;
    return new Error(String(error));
  }
}
