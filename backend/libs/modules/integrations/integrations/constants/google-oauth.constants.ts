export const GOOGLE_OAUTH_PROVIDER_KEYS = [
  'google-calendar',
  'google-business-profile',
  'google-lead-ads',
] as const;

export type GoogleOAuthProviderKey =
  (typeof GOOGLE_OAUTH_PROVIDER_KEYS)[number];

const BASE_SCOPES = ['openid', 'email', 'profile'] as const;

const PROVIDER_SCOPES: Record<GoogleOAuthProviderKey, readonly string[]> = {
  'google-calendar': [
    ...BASE_SCOPES,
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  'google-business-profile': [
    ...BASE_SCOPES,
    'https://www.googleapis.com/auth/business.manage',
  ],
  'google-lead-ads': [
    ...BASE_SCOPES,
    'https://www.googleapis.com/auth/adwords',
  ],
};

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
