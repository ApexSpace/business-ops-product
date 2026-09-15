import {
  getPinterestOAuthTokenUrl,
  getPinterestUserAccountUrl,
} from './pinterest-api.constants';

export const SOCIAL_OAUTH_PROVIDER_KEYS = ['x', 'pinterest', 'tiktok'] as const;

export type SocialOAuthProviderKey = (typeof SOCIAL_OAUTH_PROVIDER_KEYS)[number];

export function isSocialOAuthProviderKey(
  providerKey: string,
): providerKey is SocialOAuthProviderKey {
  return (SOCIAL_OAUTH_PROVIDER_KEYS as readonly string[]).includes(
    providerKey as SocialOAuthProviderKey,
  );
}

export type SocialOAuthProviderConfig = {
  providerKey: SocialOAuthProviderKey;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: readonly string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Optional userinfo URL after token exchange */
  userInfoUrl?: string;
};

const SOCIAL_OAUTH_PROVIDER_CONFIG_BASE: Record<
  SocialOAuthProviderKey,
  SocialOAuthProviderConfig
> = {
  x: {
    providerKey: 'x',
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
      'media.write',
    ],
    clientIdEnv: 'X_OAUTH_CLIENT_ID',
    clientSecretEnv: 'X_OAUTH_CLIENT_SECRET',
    userInfoUrl: 'https://api.twitter.com/2/users/me',
  },
  pinterest: {
    providerKey: 'pinterest',
    authorizeUrl: 'https://www.pinterest.com/oauth/',
    // Resolved at runtime via getSocialOAuthProviderConfig (sandbox vs production).
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: [
      'boards:read',
      'boards:write',
      'pins:read',
      'pins:write',
      'user_accounts:read',
    ],
    clientIdEnv: 'PINTEREST_OAUTH_CLIENT_ID',
    clientSecretEnv: 'PINTEREST_OAUTH_CLIENT_SECRET',
    userInfoUrl: 'https://api.pinterest.com/v5/user_account',
  },
  tiktok: {
    providerKey: 'tiktok',
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: [
      'user.info.basic',
      'user.info.profile',
      'video.upload',
      'video.publish',
    ],
    clientIdEnv: 'TIKTOK_OAUTH_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_OAUTH_CLIENT_SECRET',
    userInfoUrl: 'https://open.tiktokapis.com/v2/user/info/',
  },
};

/** Runtime config (Pinterest token/userinfo host follows sandbox env). */
export function getSocialOAuthProviderConfig(
  providerKey: SocialOAuthProviderKey,
): SocialOAuthProviderConfig {
  const base = SOCIAL_OAUTH_PROVIDER_CONFIG_BASE[providerKey];
  if (providerKey !== 'pinterest') {
    return base;
  }
  return {
    ...base,
    tokenUrl: getPinterestOAuthTokenUrl(),
    userInfoUrl: getPinterestUserAccountUrl(),
  };
}

/** Static base config. Prefer getSocialOAuthProviderConfig for Pinterest. */
export const SOCIAL_OAUTH_PROVIDER_CONFIG = SOCIAL_OAUTH_PROVIDER_CONFIG_BASE;

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
