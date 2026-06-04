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
  'Instagram connect must use Facebook Login (www.facebook.com/dialog/oauth), not Instagram direct login. Set META_INSTAGRAM_LOGIN_CONFIG_ID to a Facebook Login for Business configuration from Instagram → API setup with Facebook login — not Instagram Business Login.';

export interface BuildMetaOAuthAuthorizationUrlParams {
  appId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  configId: string;
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

/** Ensures we never redirect to Instagram Business Login / direct Instagram OAuth. */
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

export function getOAuthAuthorizeUrlHost(url: string): string {
  return new URL(url).hostname;
}
