/** Meta OAuth / Graph API — update scopes in meta-provider.config.ts for App Review. */
export const META_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export {
  META_BUSINESS_OAUTH_PROVIDER_KEYS,
  META_LOGIN_NOT_CONFIGURED_MESSAGE,
  META_PROVIDER_CONFIG,
  META_PROVIDER_KEYS,
  META_WHATSAPP_PROVIDER_KEY,
  WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE,
  getMetaProviderConfig,
  getMetaScopesForProvider,
  isMetaBusinessOAuthProviderKey,
  isMetaOAuthProviderKey,
  isMetaProviderKey,
  type MetaBusinessOAuthProviderKey,
  type MetaFlowType,
  type MetaProviderConfig,
  type MetaProviderKey,
} from './meta-provider.config';

export function getMetaGraphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION ?? 'v20.0';
}

export function getMetaOAuthAuthorizeUrl(): string {
  return `https://www.facebook.com/${getMetaGraphApiVersion()}/dialog/oauth`;
}

export function getMetaOAuthTokenUrl(): string {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}/oauth/access_token`;
}

export function getMetaGraphBaseUrl(): string {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}
