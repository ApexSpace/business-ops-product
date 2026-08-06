export const LINKEDIN_OAUTH_PROVIDER_KEY = 'linkedin' as const;

export type LinkedInOAuthProviderKey = typeof LINKEDIN_OAUTH_PROVIDER_KEY;

export function isLinkedInOAuthProviderKey(
  providerKey: string,
): providerKey is LinkedInOAuthProviderKey {
  return providerKey === LINKEDIN_OAUTH_PROVIDER_KEY;
}

/** Identity + Community Management posting scopes (product approval may be required). */
export const LINKEDIN_OAUTH_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_organization_social',
  'r_organization_social',
  'rw_organization_admin',
] as const;

export const LINKEDIN_OAUTH_AUTHORIZE_URL =
  'https://www.linkedin.com/oauth/v2/authorization';

export const LINKEDIN_OAUTH_TOKEN_URL =
  'https://www.linkedin.com/oauth/v2/accessToken';

// LinkedIn OpenID Connect userinfo endpoint
export const LINKEDIN_OIDC_USERINFO_URL =
  'https://api.linkedin.com/v2/userinfo';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
