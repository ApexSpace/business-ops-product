interface GoogleApiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      reason?: string;
      metadata?: {
        activationUrl?: string;
        serviceTitle?: string;
      };
    }>;
  };
}

export function formatGoogleApiError(
  context: string,
  status: number,
  bodyText: string,
): string {
  let parsed: GoogleApiErrorBody | null = null;
  try {
    parsed = JSON.parse(bodyText) as GoogleApiErrorBody;
  } catch {
    // use raw body below
  }

  const googleMessage = parsed?.error?.message;
  const disabledDetail = parsed?.error?.details?.find(
    (d) => d.reason === 'SERVICE_DISABLED',
  );
  const activationUrl = disabledDetail?.metadata?.activationUrl;
  const serviceTitle = disabledDetail?.metadata?.serviceTitle;

  if (activationUrl && serviceTitle) {
    return (
      `${context}: ${serviceTitle} is not enabled for your Google Cloud project. ` +
      `Enable it in Google Cloud Console, wait a few minutes, then retry sync. ` +
      `(${activationUrl})`
    );
  }

  const isQuotaError =
    status === 429 ||
    googleMessage?.toLowerCase().includes('quota exceeded') ||
    googleMessage?.toLowerCase().includes('rate limit');

  if (isQuotaError) {
    return (
      `${context}: Google API rate limit reached. Wait at least 1 minute before syncing again. ` +
      `Avoid clicking Sync repeatedly. If this keeps happening, open Google Cloud Console → ` +
      `APIs & Services → Quotas, filter for "My Business", and request a higher quota.`
    );
  }

  if (googleMessage) {
    return `${context}: ${googleMessage}`;
  }

  return `${context} (${status}): ${bodyText.slice(0, 500)}`;
}
