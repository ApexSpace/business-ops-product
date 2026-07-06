export type ParsedMetaGraphError = {
  message: string;
  type?: string;
  code?: number;
  errorSubcode?: number;
  errorUserTitle?: string;
  errorUserMsg?: string;
};

export function parseMetaGraphErrorPayload(
  raw: string,
): ParsedMetaGraphError | null {
  try {
    const jsonStart = raw.indexOf('{');
    if (jsonStart < 0) {
      return null;
    }

    const parsed = JSON.parse(raw.slice(jsonStart)) as {
      error?: Record<string, unknown>;
    };
    const error = parsed.error;
    if (!error || typeof error !== 'object') {
      return null;
    }

    return {
      message:
        typeof error.message === 'string'
          ? error.message
          : 'Meta API request failed.',
      type: typeof error.type === 'string' ? error.type : undefined,
      code: typeof error.code === 'number' ? error.code : undefined,
      errorSubcode:
        typeof error.error_subcode === 'number'
          ? error.error_subcode
          : undefined,
      errorUserTitle:
        typeof error.error_user_title === 'string'
          ? error.error_user_title
          : undefined,
      errorUserMsg:
        typeof error.error_user_msg === 'string'
          ? error.error_user_msg
          : undefined,
    };
  } catch {
    return null;
  }
}

export function getMetaGraphErrorMessage(error: unknown): string | null {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : null;
  if (!raw) {
    return null;
  }

  const parsed = parseMetaGraphErrorPayload(raw);
  return (
    parsed?.errorUserMsg ?? parsed?.errorUserTitle ?? parsed?.message ?? null
  );
}
