import { getMetaOAuthAuthorizeUrl } from '../constants/meta-oauth.constants';

/** Hosts allowed for Facebook / Instagram API with Facebook Login OAuth. */
export const META_FACEBOOK_OAUTH_AUTHORIZE_HOSTS = new Set([
  'www.facebook.com',
  'facebook.com',
  'm.facebook.com',
]);

export const META_INSTAGRAM_DIRECT_OAUTH_HOSTS = new Set([
  'www.instagram.com',
  'instagram.com',
  'api.instagram.com',
]);

export const META_INSTAGRAM_WRONG_OAUTH_HOST_MESSAGE =
  'Instagram-with-Facebook connect must use Facebook Login (www.facebook.com/dialog/oauth), not Instagram direct login. Set META_INSTAGRAM_LOGIN_CONFIG_ID to a Facebook Login for Business configuration — or choose Direct Instagram Integration in the connect chooser.';

export interface BuildMetaOAuthAuthorizationUrlParams {
  appId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  configId: string;
}

export interface BuildInstagramLoginAuthorizationUrlParams {
  appId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
}

export function buildMetaOAuthAuthorizationUrl(
  params: BuildMetaOAuthAuthorizationUrlParams,
): string {
  const searchParams = new URLSearchParams({
    client_id: params.appId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: params.scopes.join(','),
    state: params.state,
    config_id: params.configId,
  });

  const url = `${getMetaOAuthAuthorizeUrl()}?${searchParams.toString()}`;
  assertFacebookLoginOAuthAuthorizeUrl(url);
  return url;
}

/** Business Login for Instagram (Direct) — www.instagram.com/oauth/authorize */
export function buildInstagramLoginAuthorizationUrl(
  params: BuildInstagramLoginAuthorizationUrlParams,
): string {
  const searchParams = new URLSearchParams({
    client_id: params.appId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: params.scopes.join(','),
    state: params.state,
  });

  const url = `https://www.instagram.com/oauth/authorize?${searchParams.toString()}`;
  assertInstagramLoginOAuthAuthorizeUrl(url);
  return url;
}

/** Ensures Facebook-Login path never redirects to Instagram OAuth hosts. */
export function assertFacebookLoginOAuthAuthorizeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid Meta OAuth authorization URL');
  }

  if (META_INSTAGRAM_DIRECT_OAUTH_HOSTS.has(parsed.hostname)) {
    throw new Error(META_INSTAGRAM_WRONG_OAUTH_HOST_MESSAGE);
  }

  if (!META_FACEBOOK_OAUTH_AUTHORIZE_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Meta OAuth authorization URL must use www.facebook.com/dialog/oauth (got host ${parsed.hostname}).`,
    );
  }

  if (!parsed.pathname.endsWith('/dialog/oauth')) {
    throw new Error(
      `Meta OAuth authorization URL must use /dialog/oauth path (got ${parsed.pathname}).`,
    );
  }
}

export function assertInstagramLoginOAuthAuthorizeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid Instagram Login OAuth authorization URL');
  }

  if (!META_INSTAGRAM_DIRECT_OAUTH_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Direct Instagram OAuth must use www.instagram.com/oauth/authorize (got host ${parsed.hostname}).`,
    );
  }

  if (!parsed.pathname.includes('/oauth/authorize')) {
    throw new Error(
      `Direct Instagram OAuth must use /oauth/authorize path (got ${parsed.pathname}).`,
    );
  }
}

export function getOAuthAuthorizeUrlHost(url: string): string {
  return new URL(url).hostname;
}
