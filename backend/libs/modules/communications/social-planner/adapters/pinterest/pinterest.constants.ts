/** Pinterest organic pin publish limits (GHL-aligned / API guidance). */
export const PINTEREST_TITLE_MAX_LENGTH = 100;
export const PINTEREST_DESCRIPTION_MAX_LENGTH = 500;
export const PINTEREST_ALT_TEXT_MAX_LENGTH = 500;
export const PINTEREST_MAX_BOARDS_PER_POST = 25;

export const PINTEREST_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const PINTEREST_VIDEO_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
export const PINTEREST_VIDEO_MIN_DURATION_SEC = 4;
export const PINTEREST_VIDEO_MAX_DURATION_SEC = 300; // 5 min

export const PINTEREST_IMAGE_MIME_ALLOWLIST = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const PINTEREST_VIDEO_MIME_ALLOWLIST = new Set([
  'video/mp4',
  'video/quicktime', // MOV
  'video/webm',
]);

export const PINTEREST_MEDIA_POLL_INTERVAL_MS = 2_000;
export const PINTEREST_MEDIA_POLL_MAX_ATTEMPTS = 90;
