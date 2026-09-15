import { FileCategory } from '@prisma/client';

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
] as const;

export const CATEGORY_MIME_MAP: Record<FileCategory, readonly string[]> = {
  [FileCategory.IMAGE]: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  [FileCategory.PDF]: ['application/pdf'],
  [FileCategory.DOCUMENT]: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  [FileCategory.VIDEO]: ['video/mp4', 'video/webm', 'video/quicktime'],
  [FileCategory.AUDIO]: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  [FileCategory.OTHER]: [],
};
