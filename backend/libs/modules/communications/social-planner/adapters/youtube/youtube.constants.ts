/** Stored on target.platformPayload while YouTube is still uploading/processing. */
export const YOUTUBE_VIDEO_ID_PAYLOAD_KEY = '_youtubeVideoId';
export const YOUTUBE_UPLOAD_SESSION_PAYLOAD_KEY = '_youtubeUploadSessionUrl';

export const YOUTUBE_TITLE_MAX_LENGTH = 100;
export const YOUTUBE_DESCRIPTION_MAX_LENGTH = 5000;
/** Soft cap for worker memory / single-job uploads (256 MiB). */
export const YOUTUBE_MAX_FILE_BYTES = 256 * 1024 * 1024;
export const YOUTUBE_SHORTS_MAX_DURATION_SEC = 60;
export const YOUTUBE_DEFAULT_MAX_DURATION_SEC = 43_200;
export const YOUTUBE_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MiB

export const YOUTUBE_PRIVACY_STATUSES = [
  'public',
  'unlisted',
  'private',
] as const;

export type YouTubePrivacyStatus = (typeof YOUTUBE_PRIVACY_STATUSES)[number];

export const YOUTUBE_VIDEO_MIME_ALLOWLIST = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/mpeg',
]);

/** Common YouTube category IDs used when live categories API is unavailable. */
export const YOUTUBE_FALLBACK_CATEGORIES: Array<{ id: string; title: string }> =
  [
    { id: '1', title: 'Film & Animation' },
    { id: '2', title: 'Autos & Vehicles' },
    { id: '10', title: 'Music' },
    { id: '15', title: 'Pets & Animals' },
    { id: '17', title: 'Sports' },
    { id: '19', title: 'Travel & Events' },
    { id: '20', title: 'Gaming' },
    { id: '22', title: 'People & Blogs' },
    { id: '23', title: 'Comedy' },
    { id: '24', title: 'Entertainment' },
    { id: '25', title: 'News & Politics' },
    { id: '26', title: 'Howto & Style' },
    { id: '27', title: 'Education' },
    { id: '28', title: 'Science & Technology' },
  ];

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

export function isYouTubeQuotaError(error: unknown): boolean {
  if (!(error instanceof YouTubeApiError)) return false;
  const code = (error.code ?? '').toLowerCase();
  const message = error.message.toLowerCase();
  return (
    code.includes('quota') ||
    message.includes('quota') ||
    message.includes('rateLimitExceeded'.toLowerCase())
  );
}
