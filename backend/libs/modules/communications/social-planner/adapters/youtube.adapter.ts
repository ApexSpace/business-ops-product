import { Injectable } from '@nestjs/common';
import { validateAgainstPlatformSchema } from '../utils/social-publish-validation.util';
import type {
  SocialPublishAdapter,
  SocialPublishInput,
  SocialPublishResult,
  SocialPublishValidationResult,
} from './social-publish-adapter.interface';

const YOUTUBE_UPLOAD_INIT_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

interface YouTubeVideoResource {
  id?: string;
  error?: { message?: string };
}

/**
 * Simplified resumable upload: initiate a session, then push the full
 * media payload in a single PUT (adequate for planner-sized clips).
 */
@Injectable()
export class YouTubePublishAdapter implements SocialPublishAdapter {
  readonly providerKey = 'youtube';

  validate(input: SocialPublishInput): SocialPublishValidationResult {
    return validateAgainstPlatformSchema(input);
  }

  async publish(input: SocialPublishInput): Promise<SocialPublishResult> {
    const media = input.media[0];
    if (!media) {
      throw new Error('YouTube publish requires a video file');
    }

    const title = (input.platformPayload.title as string | undefined)?.trim() ||
      input.caption.slice(0, 100) ||
      'Untitled video';
    const privacyStatus =
      (input.platformPayload.privacyStatus as string | undefined) ?? 'public';
    const categoryId = input.platformPayload.categoryId as string | undefined;

    const videoBytes = await fetch(media.url).then((res) => res.arrayBuffer());

    const initResponse = await fetch(YOUTUBE_UPLOAD_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': media.mimeType,
        'X-Upload-Content-Length': String(videoBytes.byteLength),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description: input.caption,
          ...(categoryId ? { categoryId } : {}),
        },
        status: { privacyStatus },
      }),
    });

    if (!initResponse.ok) {
      const detail = await initResponse.text();
      throw new Error(`YouTube upload session init failed: ${detail}`);
    }

    const uploadUrl = initResponse.headers.get('location');
    if (!uploadUrl) {
      throw new Error('YouTube upload session did not return a location URL');
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': media.mimeType,
        'Content-Length': String(videoBytes.byteLength),
      },
      body: new Uint8Array(videoBytes),
    });

    const data = (await uploadResponse.json()) as YouTubeVideoResource;
    if (!uploadResponse.ok || !data.id) {
      throw new Error(
        `YouTube video upload failed: ${data.error?.message ?? uploadResponse.statusText}`,
      );
    }

    return {
      externalPostId: data.id,
      permalink: `https://youtube.com/watch?v=${data.id}`,
      raw: data,
    };
  }
}
