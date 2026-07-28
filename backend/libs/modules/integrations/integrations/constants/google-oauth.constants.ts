export const GOOGLE_OAUTH_PROVIDER_KEYS = [
  'google-calendar',
  'google-business-profile',
  'google-lead-ads',
] as const;

export type GoogleOAuthProviderKey =
  (typeof GOOGLE_OAUTH_PROVIDER_KEYS)[number];

export const GOOGLE_BUSINESS_MANAGE_SCOPE =
  'https://www.googleapis.com/auth/business.manage';

const BASE_SCOPES = ['openid', 'email', 'profile'] as const;

const PROVIDER_SCOPES: Record<GoogleOAuthProviderKey, readonly string[]> = {
  'google-calendar': [
    ...BASE_SCOPES,
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  'google-business-profile': [
    ...BASE_SCOPES,
    GOOGLE_BUSINESS_MANAGE_SCOPE,
  ],
  'google-lead-ads': [
    ...BASE_SCOPES,
    'https://www.googleapis.com/auth/adwords',
  ],
};

export function googleTokenHasBusinessManageScope(
  scope: string | null | undefined,
): boolean {
  if (!scope?.trim()) return false;
  const granted = new Set(
    scope
      .split(/[\s,]+/)
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
  return (
    granted.has(GOOGLE_BUSINESS_MANAGE_SCOPE.toLowerCase()) ||
    granted.has('https://www.googleapis.com/auth/plus.business.manage')
  );
}

export const GOOGLE_BUSINESS_MANAGE_SCOPE_MISSING_MESSAGE =
  'Google did not grant Business Profile access (business.manage). In Google Cloud → OAuth consent screen, add the scope https://www.googleapis.com/auth/business.manage, then Disconnect and Reconnect with Google, and approve Business Profile management when prompted.';

export function isGoogleOAuthProviderKey(
  providerKey: string,
): providerKey is GoogleOAuthProviderKey {
  return (GOOGLE_OAUTH_PROVIDER_KEYS as readonly string[]).includes(
    providerKey,
  );
}

export function getGoogleScopesForProvider(providerKey: string): string[] {
  if (isGoogleOAuthProviderKey(providerKey)) {
    return [...PROVIDER_SCOPES[providerKey]];
  }
  return [...BASE_SCOPES];
}

export const GOOGLE_OAUTH_AUTHORIZE_URL =
  'https://accounts.google.com/o/oauth2/v2/auth';

export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const GOOGLE_USERINFO_URL =
  'https://www.googleapis.com/oauth2/v3/userinfo';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
