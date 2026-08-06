import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '@app/modules/storage/services/storage.service';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';
import {
  tiktokInitInboxVideo,
  tiktokInitVideoPublish,
  tiktokPollUntilTerminal,
  tiktokUploadVideoChunks,
} from './tiktok/tiktok-api.client';
import {
  TIKTOK_PUBLISH_ID_PAYLOAD_KEY,
  TikTokApiError,
  isTikTokPullUrlError,
  isUnauditedPrivateAccountError,
} from './tiktok/tiktok.constants';
import {
  buildTikTokPostInfo,
  validateTikTokPublishInput,
} from './tiktok/tiktok-validation.util';

const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10 MiB

type PersistPublishId = (publishId: string) => Promise<void>;

/**
 * Content Posting API — Direct Post first, then inbox draft upload if
 * unaudited Direct Post is blocked (common in Sandbox / pre-audit).
 */
@Injectable()
export class TikTokPublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'tiktok';
  private readonly logger = new Logger(TikTokPublishAdapter.name);

  constructor(private readonly storageService: StorageService) {}

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    const payload = input.platformPayload ?? {};
    const privacyOptions = Array.isArray(payload._privacyLevelOptions)
      ? (payload._privacyLevelOptions as string[])
      : undefined;
    const maxDurationSec =
      typeof payload._maxDurationSec === 'number'
        ? payload._maxDurationSec
        : undefined;
    return validateTikTokPublishInput(input, {
      privacyLevelOptions: privacyOptions,
      maxDurationSec,
      commentDisabled: Boolean(payload._commentDisabled),
      duetDisabled: Boolean(payload._duetDisabled),
      stitchDisabled: Boolean(payload._stitchDisabled),
    });
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const media = input.media[0];
    if (!media) {
      throw new Error('TikTok publish requires a video file');
    }

    const existingPublishId = this.readResumePublishId(input);
    if (existingPublishId) {
      this.logger.log(
        `Resuming TikTok publish status poll for publish_id=${existingPublishId} target=${String(input.metadata?.socialPostTargetId ?? '')}`,
      );
      return this.finishWithStatusPoll(input.accessToken, existingPublishId);
    }

    const postInfo = buildTikTokPostInfo(input);
    const persistPublishId = this.readPersistCallback(input);
    const targetId = String(input.metadata?.socialPostTargetId ?? '');

    try {
      return await this.publishDirect(input, media, postInfo, persistPublishId);
    } catch (error) {
      if (isUnauditedPrivateAccountError(error)) {
        this.logger.warn(
          `TikTok Direct Post blocked for unaudited client (target=${targetId}); falling back to inbox draft upload`,
        );
        return this.publishViaInbox({
          accessToken: input.accessToken,
          media,
          persistPublishId,
          targetId,
        });
      }
      throw this.rewritePublishError(error);
    }
  }

  private async publishDirect(
    input: SocialPublishInput,
    media: SocialPublishInput['media'][0],
    postInfo: Record<string, unknown>,
    persistPublishId?: PersistPublishId,
  ): Promise<SocialPublishResult> {
    const preferPull = Boolean(media.isPublicUrl);
    if (preferPull) {
      try {
        return await this.publishViaPull({
          accessToken: input.accessToken,
          postInfo,
          videoUrl: media.url,
          persistPublishId,
          targetId: String(input.metadata?.socialPostTargetId ?? ''),
        });
      } catch (error) {
        if (!isTikTokPullUrlError(error)) {
          throw error;
        }
        this.logger.warn(
          `TikTok PULL_FROM_URL failed (${error instanceof TikTokApiError ? error.code : 'unknown'}); falling back to FILE_UPLOAD`,
        );
      }
    }

    return this.publishViaFileUpload({
      accessToken: input.accessToken,
      postInfo,
      media,
      persistPublishId,
      targetId: String(input.metadata?.socialPostTargetId ?? ''),
      mode: 'direct',
    });
  }

  private rewritePublishError(error: unknown): Error {
    if (!(error instanceof TikTokApiError)) {
      return error instanceof Error ? error : new Error(String(error));
    }
    if (isUnauditedPrivateAccountError(error)) {
      return new TikTokApiError(
        'TikTok blocked Direct Post for this unaudited/Sandbox app. Set the TikTok account to Private in the TikTok app, or retry so we can upload as an inbox draft instead.',
        error.code,
        error.logId,
        error.httpStatus,
      );
    }
    return error;
  }

  private async publishViaPull(params: {
    accessToken: string;
    postInfo: Record<string, unknown>;
    videoUrl: string;
    persistPublishId?: PersistPublishId;
    targetId: string;
  }): Promise<SocialPublishResult> {
    const data = await tiktokInitVideoPublish(params.accessToken, {
      post_info: params.postInfo,
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: params.videoUrl,
      },
    });
    if (!data.publish_id) {
      throw new TikTokApiError(
        'TikTok publish init did not return publish_id',
        'missing_publish_id',
      );
    }
    this.logger.log(
      `TikTok PULL_FROM_URL init ok publish_id=${data.publish_id} target=${params.targetId}`,
    );
    await params.persistPublishId?.(data.publish_id);
    return this.finishWithStatusPoll(params.accessToken, data.publish_id);
  }

  private async publishViaFileUpload(params: {
    accessToken: string;
    postInfo?: Record<string, unknown>;
    media: SocialPublishInput['media'][0];
    persistPublishId?: PersistPublishId;
    targetId: string;
    mode: 'direct' | 'inbox';
  }): Promise<SocialPublishResult> {
    const bytes = await this.loadMediaBytes(params.media);
    const videoSize = bytes.byteLength;
    const chunkSize = Math.min(DEFAULT_CHUNK_SIZE, videoSize);
    const totalChunkCount = Math.max(1, Math.ceil(videoSize / chunkSize));
    const sourceInfo = {
      source: 'FILE_UPLOAD',
      video_size: videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount,
    };

    const data =
      params.mode === 'inbox'
        ? await tiktokInitInboxVideo(params.accessToken, sourceInfo)
        : await tiktokInitVideoPublish(params.accessToken, {
            post_info: params.postInfo,
            source_info: sourceInfo,
          });

    if (!data.publish_id || !data.upload_url) {
      throw new TikTokApiError(
        'TikTok FILE_UPLOAD init did not return publish_id/upload_url',
        'missing_upload_url',
      );
    }

    this.logger.log(
      `TikTok ${params.mode} FILE_UPLOAD init ok publish_id=${data.publish_id} size=${videoSize} target=${params.targetId}`,
    );
    await params.persistPublishId?.(data.publish_id);

    await tiktokUploadVideoChunks({
      uploadUrl: data.upload_url,
      bytes,
      chunkSize,
    });

    return this.finishWithStatusPoll(params.accessToken, data.publish_id);
  }

  private async publishViaInbox(params: {
    accessToken: string;
    media: SocialPublishInput['media'][0];
    persistPublishId?: PersistPublishId;
    targetId: string;
  }): Promise<SocialPublishResult> {
    const preferPull = Boolean(params.media.isPublicUrl);
    if (preferPull) {
      try {
        const data = await tiktokInitInboxVideo(params.accessToken, {
          source: 'PULL_FROM_URL',
          video_url: params.media.url,
        });
        if (!data.publish_id) {
          throw new TikTokApiError(
            'TikTok inbox init did not return publish_id',
            'missing_publish_id',
          );
        }
        this.logger.log(
          `TikTok inbox PULL_FROM_URL init ok publish_id=${data.publish_id} target=${params.targetId}`,
        );
        await params.persistPublishId?.(data.publish_id);
        return this.finishWithStatusPoll(params.accessToken, data.publish_id);
      } catch (error) {
        if (!isTikTokPullUrlError(error)) {
          throw error;
        }
        this.logger.warn(
          'TikTok inbox PULL_FROM_URL failed; falling back to FILE_UPLOAD',
        );
      }
    }

    return this.publishViaFileUpload({
      accessToken: params.accessToken,
      media: params.media,
      persistPublishId: params.persistPublishId,
      targetId: params.targetId,
      mode: 'inbox',
    });
  }

  private async finishWithStatusPoll(
    accessToken: string,
    publishId: string,
  ): Promise<SocialPublishResult> {
    const result = await tiktokPollUntilTerminal({
      accessToken,
      publishId,
    });
    if (!result.ok) {
      throw new TikTokApiError(
        result.failReason ?? 'TikTok publish failed',
        result.status || 'PUBLISH_FAILED',
      );
    }
    return {
      externalPostId: result.videoId,
      permalink:
        result.hasPublicVideoId && !result.inboxDraft
          ? `https://www.tiktok.com/@/video/${result.videoId}`
          : undefined,
      raw: {
        ...result.raw,
        inboxDraft: result.inboxDraft,
        hasPublicVideoId: result.hasPublicVideoId,
      },
    };
  }

  private async loadMediaBytes(
    media: SocialPublishInput['media'][0],
  ): Promise<Buffer> {
    if (media.objectKey) {
      return this.storageService.getObjectBytes(media.objectKey);
    }
    const response = await fetch(media.url);
    if (!response.ok) {
      throw new Error(
        `Failed to download media for TikTok FILE_UPLOAD (${response.status})`,
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private readResumePublishId(input: SocialPublishInput): string | null {
    const value = input.platformPayload?.[TIKTOK_PUBLISH_ID_PAYLOAD_KEY];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readPersistCallback(
    input: SocialPublishInput,
  ): PersistPublishId | undefined {
    const cb = input.metadata?.onTikTokPublishInitiated;
    return typeof cb === 'function'
      ? (cb as PersistPublishId)
      : undefined;
  }
}
