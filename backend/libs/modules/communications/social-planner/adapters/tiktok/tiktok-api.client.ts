import {
  TIKTOK_CREATOR_INFO_URL,
  TIKTOK_INBOX_INIT_URL,
  TIKTOK_PUBLISH_INIT_URL,
  TIKTOK_PUBLISH_STATUS_URL,
  TikTokApiError,
  type TikTokApiErrorBody,
  type TikTokCreatorInfoData,
  type TikTokInitData,
  type TikTokStatusData,
} from './tiktok.constants';

interface TikTokEnvelope<T> {
  data?: T;
  error?: TikTokApiErrorBody;
}

async function parseTikTokJson<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const json = (await response.json()) as TikTokEnvelope<T>;
  const err = json.error;
  const code = err?.code ?? 'unknown';
  const ok = response.ok && (!err || code === 'ok');
  if (!ok || json.data === undefined) {
    throw new TikTokApiError(
      err?.message || fallbackMessage,
      code === 'ok' ? 'empty_data' : code,
      err?.log_id,
      response.status,
    );
  }
  return json.data;
}

export async function tiktokInitVideoPublish(
  accessToken: string,
  body: Record<string, unknown>,
): Promise<TikTokInitData> {
  const response = await fetch(TIKTOK_PUBLISH_INIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });
  return parseTikTokJson<TikTokInitData>(
    response,
    'TikTok publish init failed',
  );
}

/** Upload-to-inbox (draft) — works for unaudited apps without Direct Post private-account rule. */
export async function tiktokInitInboxVideo(
  accessToken: string,
  sourceInfo: Record<string, unknown>,
): Promise<TikTokInitData> {
  const response = await fetch(TIKTOK_INBOX_INIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ source_info: sourceInfo }),
  });
  return parseTikTokJson<TikTokInitData>(
    response,
    'TikTok inbox upload init failed',
  );
}

export async function tiktokFetchPublishStatus(
  accessToken: string,
  publishId: string,
): Promise<TikTokStatusData> {
  const response = await fetch(TIKTOK_PUBLISH_STATUS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  return parseTikTokJson<TikTokStatusData>(
    response,
    'TikTok publish status fetch failed',
  );
}

export async function tiktokQueryCreatorInfo(
  accessToken: string,
): Promise<TikTokCreatorInfoData> {
  const response = await fetch(TIKTOK_CREATOR_INFO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({}),
  });
  return parseTikTokJson<TikTokCreatorInfoData>(
    response,
    'TikTok creator info query failed',
  );
}

export async function tiktokUploadVideoChunks(params: {
  uploadUrl: string;
  bytes: Buffer;
  chunkSize: number;
}): Promise<void> {
  const { uploadUrl, bytes, chunkSize } = params;
  const totalSize = bytes.byteLength;
  let offset = 0;
  while (offset < totalSize) {
    const end = Math.min(offset + chunkSize, totalSize);
    const chunk = bytes.subarray(offset, end);
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(chunk.byteLength),
        'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
      },
      body: new Uint8Array(chunk),
    });
    if (!response.ok && response.status !== 201 && response.status !== 206) {
      const detail = await response.text().catch(() => response.statusText);
      throw new TikTokApiError(
        `TikTok chunk upload failed: ${detail}`,
        'chunk_upload_failed',
        undefined,
        response.status,
      );
    }
    offset = end;
  }
}

const TERMINAL_SUCCESS = new Set([
  'PUBLISH_COMPLETE',
  'SEND_TO_USER_INBOX',
]);
const TERMINAL_FAILURE = new Set([
  'FAILED',
  'PUBLISH_FAILED',
  'UPLOAD_FAILED',
]);

export type TikTokPollResult =
  | {
      ok: true;
      videoId: string;
      status: string;
      inboxDraft: boolean;
      /** False when TikTok gave no public post id (typical for SELF_ONLY). */
      hasPublicVideoId: boolean;
      raw: TikTokStatusData;
    }
  | { ok: false; status: string; failReason?: string; raw: TikTokStatusData };

export async function tiktokPollUntilTerminal(params: {
  accessToken: string;
  publishId: string;
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}): Promise<TikTokPollResult> {
  const maxAttempts = params.maxAttempts ?? 40;
  const maxDelayMs = params.maxDelayMs ?? 15_000;
  let delayMs = params.initialDelayMs ?? 2_000;

  let last: TikTokStatusData = {};
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(delayMs);
      delayMs = Math.min(Math.round(delayMs * 1.4), maxDelayMs);
    }
    last = await tiktokFetchPublishStatus(params.accessToken, params.publishId);
    const status = (last.status ?? '').toUpperCase();
    if (TERMINAL_SUCCESS.has(status)) {
      const videoId =
        last.publicly_available_post_id?.[0] ??
        last.publicaly_available_post_id?.[0];
      if (videoId) {
        return {
          ok: true,
          videoId: String(videoId),
          status,
          inboxDraft: status === 'SEND_TO_USER_INBOX',
          hasPublicVideoId: true,
          raw: last,
        };
      }
      // Private / unaudited Direct Posts and inbox drafts often omit a public video id.
      if (
        status === 'SEND_TO_USER_INBOX' ||
        status === 'PUBLISH_COMPLETE'
      ) {
        return {
          ok: true,
          videoId: params.publishId,
          status,
          inboxDraft: status === 'SEND_TO_USER_INBOX',
          hasPublicVideoId: false,
          raw: last,
        };
      }
      return {
        ok: false,
        status,
        failReason: 'Publish completed but no video id was returned',
        raw: last,
      };
    }
    if (TERMINAL_FAILURE.has(status)) {
      return {
        ok: false,
        status,
        failReason: last.fail_reason ?? 'TikTok publish failed',
        raw: last,
      };
    }
  }

  return {
    ok: false,
    status: last.status ?? 'TIMEOUT',
    failReason: 'Timed out waiting for TikTok publish to complete',
    raw: last,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
