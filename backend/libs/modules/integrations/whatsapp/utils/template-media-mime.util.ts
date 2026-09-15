const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  '3gp': 'video/3gpp',
  pdf: 'application/pdf',
};

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/3gpp',
  'application/pdf',
]);

export function resolveTemplateMediaMimeType(
  mimeType: string | undefined,
  filename: string | undefined,
): string {
  const normalizedMime = mimeType?.trim().toLowerCase();
  if (normalizedMime && ALLOWED_MIME_TYPES.has(normalizedMime)) {
    return normalizedMime;
  }

  const extension = filename?.split('.').pop()?.toLowerCase();
  if (extension && MIME_BY_EXTENSION[extension]) {
    return MIME_BY_EXTENSION[extension];
  }

  throw new Error(
    'Unsupported media type. Allowed formats: JPEG, PNG, WEBP, MP4, 3GP, PDF.',
  );
}

export function assertAllowedTemplateMediaMime(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      'Unsupported media type. Allowed formats: JPEG, PNG, WEBP, MP4, 3GP, PDF.',
    );
  }
}
