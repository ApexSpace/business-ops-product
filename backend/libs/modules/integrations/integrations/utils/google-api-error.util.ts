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
  const googleStatus = parsed?.error?.status;
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
      `${context}: Google API rate limit or zero quota. ` +
      `If this is a new Google Cloud project, submit GBP API access (Basic API Access) and wait until My Business quotas are above 0 QPM. ` +
      `Otherwise wait at least 1 minute before syncing again.`
    );
  }

  const isInsufficientScopes =
    googleMessage?.toLowerCase().includes('insufficient authentication scopes') ||
    googleMessage?.toLowerCase().includes('insufficient scope') ||
    googleStatus === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT';

  if (isInsufficientScopes) {
    return (
      `${context}: ${googleMessage ?? 'Insufficient authentication scopes'}. ` +
      `Disconnect and Reconnect with Google, approve Business Profile management ` +
      `(business.manage) on the consent screen, and confirm that scope is listed ` +
      `on your Google Cloud OAuth consent screen. Manager access from a company owner is supported once this scope is granted.`
    );
  }

  if (
    status === 403 ||
    googleMessage?.toLowerCase().includes('permission') ||
    googleMessage?.toLowerCase().includes('access not configured') ||
    googleStatus === 'PERMISSION_DENIED'
  ) {
    return (
      `${context}: ${googleMessage ?? 'Permission denied'}. ` +
      `Confirm Account Management and Business Information APIs are enabled, ` +
      `GBP API access is approved for this Cloud project, and the signed-in user owns or manages the Business Profile.`
    );
  }

  if (googleMessage) {
    return `${context}: ${googleMessage}`;
  }

  return `${context} (${status}): ${bodyText.slice(0, 500)}`;
}
