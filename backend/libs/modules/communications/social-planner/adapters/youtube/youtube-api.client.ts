import {
  YOUTUBE_FALLBACK_CATEGORIES,
  YOUTUBE_UPLOAD_CHUNK_SIZE,
  YouTubeApiError,
} from './youtube.constants';

const YOUTUBE_UPLOAD_INIT_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';
const YOUTUBE_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const YOUTUBE_CATEGORIES_URL =
  'https://www.googleapis.com/youtube/v3/videoCategories';
const YOUTUBE_THUMBNAILS_URL =
  'https://www.googleapis.com/upload/youtube/v3/thumbnails/set';

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throwIfGoogleError(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) return;
  let message = fallback;
  let reason: string | undefined;
  try {
    const json = (await response.json()) as GoogleErrorBody;
    message = json.error?.message ?? fallback;
    reason = json.error?.errors?.[0]?.reason;
  } catch {
    const text = await response.text().catch(() => '');
    if (text) message = `${fallback}: ${text}`;
  }
  throw new YouTubeApiError(message, reason, response.status);
}

export async function youtubeAssertChannelAccessible(params: {
  accessToken: string;
  channelId: string;
}): Promise<void> {
  const url = new URL(YOUTUBE_CHANNELS_URL);
  url.searchParams.set('part', 'id');
  url.searchParams.set('mine', 'true');
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  await throwIfGoogleError(response, 'Failed to list YouTube channels');
  const data = (await response.json()) as {
    items?: Array<{ id?: string }>;
  };
  const ids = (data.items ?? []).map((i) => i.id).filter(Boolean);
  if (!ids.includes(params.channelId)) {
    throw new YouTubeApiError(
      'Selected YouTube channel is not available for this Google account. Reconnect YouTube and select a channel you own.',
      'channel_mismatch',
      400,
    );
  }
}

export async function youtubeListCategories(params: {
  accessToken: string;
  regionCode?: string;
}): Promise<Array<{ id: string; title: string }>> {
  const url = new URL(YOUTUBE_CATEGORIES_URL);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('regionCode', params.regionCode ?? 'US');
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!response.ok) {
    return YOUTUBE_FALLBACK_CATEGORIES.map((c) => ({
      id: c.id,
      title: c.title,
    }));
  }
  const data = (await response.json()) as {
    items?: Array<{
      id?: string;
      snippet?: { title?: string; assignable?: boolean };
    }>;
  };
  const categories = (data.items ?? [])
    .filter((item) => item.id && item.snippet?.assignable !== false)
    .map((item) => ({
      id: String(item.id),
      title: item.snippet?.title ?? String(item.id),
    }));
  return categories.length > 0
    ? categories
    : YOUTUBE_FALLBACK_CATEGORIES.map((c) => ({ id: c.id, title: c.title }));
}

export async function youtubeInitResumableUpload(params: {
  accessToken: string;
  mimeType: string;
  byteSize: number;
  snippet: Record<string, unknown>;
  status: Record<string, unknown>;
}): Promise<string> {
  const response = await fetch(YOUTUBE_UPLOAD_INIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': params.mimeType,
      'X-Upload-Content-Length': String(params.byteSize),
    },
    body: JSON.stringify({
      snippet: params.snippet,
      status: params.status,
    }),
  });
  await throwIfGoogleError(response, 'YouTube upload session init failed');
  const uploadUrl = response.headers.get('location');
  if (!uploadUrl) {
    throw new YouTubeApiError(
      'YouTube upload session did not return a location URL',
      'missing_upload_url',
    );
  }
  return uploadUrl;
}

export async function youtubeUploadVideoChunks(params: {
  uploadUrl: string;
  bytes: Uint8Array;
  mimeType: string;
  chunkSize?: number;
}): Promise<{ id: string; raw: unknown }> {
  const chunkSize = params.chunkSize ?? YOUTUBE_UPLOAD_CHUNK_SIZE;
  const total = params.bytes.byteLength;
  let offset = 0;
  let lastJson: { id?: string; error?: { message?: string } } = {};

  while (offset < total) {
    const end = Math.min(offset + chunkSize, total) - 1;
    const chunk = params.bytes.subarray(offset, end + 1);
    const response = await fetch(params.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': params.mimeType,
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${offset}-${end}/${total}`,
      },
      body: new Uint8Array(chunk),
    });

    // 308 Resume Incomplete — continue; 200/201 — done
    if (response.status === 308) {
      const range = response.headers.get('range');
      if (range) {
        const match = /bytes=0-(\d+)/.exec(range);
        if (match) {
          offset = Number(match[1]) + 1;
          continue;
        }
      }
      offset = end + 1;
      continue;
    }

    if (!response.ok) {
      await throwIfGoogleError(response, 'YouTube video upload failed');
    }

    lastJson = (await response.json()) as typeof lastJson;
    if (!lastJson.id) {
      throw new YouTubeApiError(
        lastJson.error?.message ?? 'YouTube upload completed without a video id',
        'missing_video_id',
      );
    }
    return { id: lastJson.id, raw: lastJson };
  }

  throw new YouTubeApiError(
    'YouTube upload ended without a completed response',
    'upload_incomplete',
  );
}

export type YouTubeProcessingResult =
  | { ok: true; videoId: string; uploadStatus: string; raw: unknown }
  | {
      ok: false;
      videoId: string;
      uploadStatus: string;
      failReason: string;
      raw: unknown;
    };

export async function youtubePollUntilProcessed(params: {
  accessToken: string;
  videoId: string;
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}): Promise<YouTubeProcessingResult> {
  const maxAttempts = params.maxAttempts ?? 40;
  const maxDelayMs = params.maxDelayMs ?? 15_000;
  let delayMs = params.initialDelayMs ?? 2_000;
  let lastRaw: unknown = {};

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(delayMs);
      delayMs = Math.min(Math.round(delayMs * 1.4), maxDelayMs);
    }

    const url = new URL(YOUTUBE_VIDEOS_URL);
    url.searchParams.set('part', 'status,processingDetails');
    url.searchParams.set('id', params.videoId);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    await throwIfGoogleError(response, 'YouTube processing status fetch failed');
    const data = (await response.json()) as {
      items?: Array<{
        id?: string;
        status?: {
          uploadStatus?: string;
          rejectionReason?: string;
          failureReason?: string;
        };
        processingDetails?: {
          processingStatus?: string;
          processingFailureReason?: string;
        };
      }>;
    };
    lastRaw = data;
    const item = data.items?.[0];
    const uploadStatus = (item?.status?.uploadStatus ?? '').toLowerCase();
    const processingStatus = (
      item?.processingDetails?.processingStatus ?? ''
    ).toLowerCase();

    if (uploadStatus === 'processed' || processingStatus === 'succeeded') {
      return {
        ok: true,
        videoId: params.videoId,
        uploadStatus: uploadStatus || processingStatus || 'processed',
        raw: lastRaw,
      };
    }

    if (
      uploadStatus === 'rejected' ||
      uploadStatus === 'failed' ||
      processingStatus === 'failed'
    ) {
      return {
        ok: false,
        videoId: params.videoId,
        uploadStatus: uploadStatus || processingStatus,
        failReason:
          item?.status?.rejectionReason ||
          item?.status?.failureReason ||
          item?.processingDetails?.processingFailureReason ||
          'YouTube rejected or failed video processing',
        raw: lastRaw,
      };
    }
  }

  return {
    ok: false,
    videoId: params.videoId,
    uploadStatus: 'timeout',
    failReason: 'Timed out waiting for YouTube video processing',
    raw: lastRaw,
  };
}

export async function youtubeSetThumbnail(params: {
  accessToken: string;
  videoId: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<void> {
  const url = new URL(YOUTUBE_THUMBNAILS_URL);
  url.searchParams.set('videoId', params.videoId);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': params.mimeType,
      'Content-Length': String(params.bytes.byteLength),
    },
    body: new Uint8Array(params.bytes),
  });
  await throwIfGoogleError(response, 'YouTube thumbnail upload failed');
}
