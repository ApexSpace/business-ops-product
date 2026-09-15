import {
  getPinterestBoardsUrl,
  getPinterestMediaUrl,
  getPinterestPinsUrl,
} from '@app/modules/integrations/integrations/constants/pinterest-api.constants';
import {
  PINTEREST_MEDIA_POLL_INTERVAL_MS,
  PINTEREST_MEDIA_POLL_MAX_ATTEMPTS,
} from './pinterest.constants';

export class PinterestApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'PinterestApiError';
  }
}

interface PinterestPinResponse {
  id?: string;
  message?: string;
}

interface PinterestMediaCreateResponse {
  media_id?: string;
  media_type?: string;
  upload_url?: string;
  upload_parameters?: Record<string, string>;
  message?: string;
}

interface PinterestMediaStatusResponse {
  media_id?: string;
  status?: string;
  message?: string;
}

interface PinterestBoardResponse {
  id?: string;
  name?: string;
  description?: string;
  privacy?: string;
  message?: string;
}

export async function pinterestCreateImagePin(params: {
  accessToken: string;
  boardId: string;
  title: string;
  description: string;
  link?: string;
  altText?: string;
  imageUrl: string;
}): Promise<{ id: string; raw: unknown }> {
  const body: Record<string, unknown> = {
    board_id: params.boardId,
    title: params.title,
    description: params.description,
    media_source: {
      source_type: 'image_url',
      url: params.imageUrl,
    },
  };
  if (params.link) body.link = params.link;
  if (params.altText) body.alt_text = params.altText;

  const response = await fetch(getPinterestPinsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as PinterestPinResponse;
  if (!response.ok || !data.id) {
    throw new PinterestApiError(
      data.message ?? `Pinterest pin create failed (${response.status})`,
      response.status,
      data,
    );
  }
  return { id: data.id, raw: data };
}

export async function pinterestRegisterVideoUpload(
  accessToken: string,
): Promise<{
  mediaId: string;
  uploadUrl: string;
  uploadParameters: Record<string, string>;
}> {
  const response = await fetch(getPinterestMediaUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ media_type: 'video' }),
  });

  const data = (await response.json()) as PinterestMediaCreateResponse;
  if (
    !response.ok ||
    !data.media_id ||
    !data.upload_url ||
    !data.upload_parameters
  ) {
    throw new PinterestApiError(
      data.message ?? `Pinterest media register failed (${response.status})`,
      response.status,
      data,
    );
  }

  return {
    mediaId: data.media_id,
    uploadUrl: data.upload_url,
    uploadParameters: data.upload_parameters,
  };
}

export async function pinterestUploadVideoFile(params: {
  uploadUrl: string;
  uploadParameters: Record<string, string>;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<void> {
  const form = new FormData();
  for (const [key, value] of Object.entries(params.uploadParameters)) {
    form.append(key, value);
  }
  form.append(
    'file',
    new Blob([new Uint8Array(params.fileBuffer)], { type: params.mimeType }),
    params.fileName,
  );

  const response = await fetch(params.uploadUrl, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new PinterestApiError(
      `Pinterest video upload failed (${response.status}): ${detail}`,
      response.status,
    );
  }
}

export async function pinterestWaitForMediaReady(params: {
  accessToken: string;
  mediaId: string;
}): Promise<void> {
  for (let attempt = 0; attempt < PINTEREST_MEDIA_POLL_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(
      `${getPinterestMediaUrl()}/${params.mediaId}`,
      {
        headers: { Authorization: `Bearer ${params.accessToken}` },
      },
    );
    const data = (await response.json()) as PinterestMediaStatusResponse;
    if (!response.ok) {
      throw new PinterestApiError(
        data.message ?? `Pinterest media status failed (${response.status})`,
        response.status,
        data,
      );
    }

    const status = (data.status ?? '').toLowerCase();
    if (status === 'succeeded' || status === 'complete' || status === 'ready') {
      return;
    }
    if (status === 'failed' || status === 'failure') {
      throw new PinterestApiError(
        `Pinterest video processing failed (status=${status})`,
        response.status,
        data,
      );
    }

    await new Promise((r) => setTimeout(r, PINTEREST_MEDIA_POLL_INTERVAL_MS));
  }

  throw new PinterestApiError(
    'Timed out waiting for Pinterest video processing',
  );
}

export async function pinterestCreateVideoPin(params: {
  accessToken: string;
  boardId: string;
  title: string;
  description: string;
  link?: string;
  altText?: string;
  mediaId: string;
}): Promise<{ id: string; raw: unknown }> {
  const body: Record<string, unknown> = {
    board_id: params.boardId,
    title: params.title,
    description: params.description,
    media_source: {
      source_type: 'video_id',
      media_id: params.mediaId,
    },
  };
  if (params.link) body.link = params.link;
  if (params.altText) body.alt_text = params.altText;

  const response = await fetch(getPinterestPinsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as PinterestPinResponse;
  if (!response.ok || !data.id) {
    throw new PinterestApiError(
      data.message ?? `Pinterest video pin create failed (${response.status})`,
      response.status,
      data,
    );
  }
  return { id: data.id, raw: data };
}

export async function pinterestCreateBoard(params: {
  accessToken: string;
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}): Promise<{
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  raw: unknown;
}> {
  const response = await fetch(getPinterestBoardsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name,
      ...(params.description ? { description: params.description } : {}),
      ...(params.privacy ? { privacy: params.privacy } : {}),
    }),
  });

  const data = (await response.json()) as PinterestBoardResponse;
  if (!response.ok || !data.id) {
    throw new PinterestApiError(
      data.message ?? `Pinterest board create failed (${response.status})`,
      response.status,
      data,
    );
  }

  return {
    id: data.id,
    name: data.name ?? params.name,
    description: data.description,
    privacy: data.privacy,
    raw: data,
  };
}
