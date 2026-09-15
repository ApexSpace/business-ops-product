import {
  IntegrationConnectionType,
  IntegrationResourceType,
} from '@prisma/client';

export const META_PROVIDER_KEYS = [
  'facebook',
  'instagram',
  'whatsapp',
] as const;

export type MetaProviderKey = (typeof META_PROVIDER_KEYS)[number];

export type MetaFlowType = 'META_OAUTH' | 'WHATSAPP_EMBEDDED_SIGNUP';

export interface MetaProviderConfig {
  providerKey: MetaProviderKey;
  flowType: MetaFlowType;
  resourceTypes: readonly IntegrationResourceType[];
  connectionType: IntegrationConnectionType;
  scopes: readonly string[];
}

export const META_PROVIDER_CONFIG: Record<MetaProviderKey, MetaProviderConfig> =
  {
    facebook: {
      providerKey: 'facebook',
      flowType: 'META_OAUTH',
      resourceTypes: [IntegrationResourceType.FACEBOOK_PAGE],
      connectionType: IntegrationConnectionType.OAUTH,
      scopes: [
        'public_profile',
        'email',
        // Required for Pages linked to a Meta Business (Graph v17+); without it
        // /me/accounts often returns [] even when the user selected Pages in OAuth.
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_messaging',
        'pages_manage_posts',
        'pages_manage_engagement',
        'pages_read_user_content',
        'publish_video',
      ],
    },
    instagram: {
      providerKey: 'instagram',
      flowType: 'META_OAUTH',
      resourceTypes: [IntegrationResourceType.INSTAGRAM_ACCOUNT],
      connectionType: IntegrationConnectionType.OAUTH,
      /** Instagram API with Facebook Login — authorize via facebook.com/dialog/oauth */
      scopes: [
        'email',
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'instagram_basic',
        'instagram_manage_messages',
        'instagram_content_publish',
        'instagram_manage_comments',
        'instagram_manage_contents',
      ],
    },
    whatsapp: {
      providerKey: 'whatsapp',
      flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
      resourceTypes: [IntegrationResourceType.PHONE_NUMBER],
      connectionType: IntegrationConnectionType.EMBEDDED_SIGNUP,
      scopes: [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management',
      ],
    },
  };

export const META_BUSINESS_OAUTH_PROVIDER_KEYS = [
  'facebook',
  'instagram',
] as const;

export type MetaBusinessOAuthProviderKey =
  (typeof META_BUSINESS_OAUTH_PROVIDER_KEYS)[number];

export const META_WHATSAPP_PROVIDER_KEY = 'whatsapp' as const;

/** @deprecated Fallback only — prefer META_FACEBOOK_LOGIN_CONFIG_ID */
export const META_LOGIN_NOT_CONFIGURED_MESSAGE =
  'Meta Login configuration ID is missing. Set META_LOGIN_CONFIG_ID.';

export const META_FACEBOOK_LOGIN_NOT_CONFIGURED_MESSAGE =
  'Facebook Login configuration ID is missing. Set META_FACEBOOK_LOGIN_CONFIG_ID.';

export const META_INSTAGRAM_LOGIN_NOT_CONFIGURED_MESSAGE =
  'Instagram Login configuration ID is missing. Set META_INSTAGRAM_LOGIN_CONFIG_ID.';

export const WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE =
  'WhatsApp Embedded Signup configuration ID is missing. Set META_EMBEDDED_SIGNUP_CONFIG_ID.';

export const META_CONFIG_IDS_MUST_DIFFER_MESSAGE =
  'Meta Login and WhatsApp Embedded Signup configuration IDs must be different. Use Login for Business for Facebook/Instagram and Embedded Signup for WhatsApp.';

export const META_OAUTH_CONFIG_MATCHES_WHATSAPP_MESSAGE =
  'OAuth Login configuration ID must not match META_EMBEDDED_SIGNUP_CONFIG_ID. Use separate Login for Business and Embedded Signup configurations.';

export const META_WRONG_CONFIG_FOR_OAUTH_MESSAGE =
  'Facebook and Instagram require Login for Business configuration IDs. Do not use META_EMBEDDED_SIGNUP_CONFIG_ID for OAuth.';

export const META_WRONG_CONFIG_FOR_WHATSAPP_MESSAGE =
  'WhatsApp requires META_EMBEDDED_SIGNUP_CONFIG_ID. Do not use Facebook or Instagram Login configuration IDs for WhatsApp Embedded Signup.';

export const META_FACEBOOK_INSTAGRAM_SAME_CONFIG_WARNING =
  'Facebook and Instagram are using the same Meta Login config ID; hosted UI may look identical.';

export const META_INSTAGRAM_NO_ACCOUNTS_MESSAGE =
  'No linked Instagram account was found in the Pages returned by Meta. Please make sure you selected the Facebook Page that is connected to your Instagram Professional Account during authorization.';

export const META_INSTAGRAM_DIRECT_NO_ACCOUNT_MESSAGE =
  'No Instagram account profile was returned for this Direct Instagram connection. Reconnect with a Business or Creator Instagram account.';

export const META_FACEBOOK_NO_PAGES_MESSAGE =
  'No Facebook Pages were returned by Meta for this connection. Select the Page during authorization, ensure you are a Page admin, and that your Facebook Login for Business configuration includes the business_management permission (required for Business-linked Pages). Then reconnect Facebook.';

/** Instagram API with Instagram Login (Direct) — no Facebook Page required. */
export const META_INSTAGRAM_LOGIN_AUTH_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_content_publish',
  'instagram_business_manage_comments',
] as const;

export type MetaInstagramAuthFlow = 'FACEBOOK_LOGIN' | 'INSTAGRAM_LOGIN';

export const META_INSTAGRAM_AUTH_FLOWS = [
  'FACEBOOK_LOGIN',
  'INSTAGRAM_LOGIN',
] as const;

export function parseMetaInstagramAuthFlow(
  value: string | undefined | null,
): MetaInstagramAuthFlow {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (
    normalized === 'instagram_login' ||
    normalized === 'direct' ||
    normalized === 'instagram'
  ) {
    return 'INSTAGRAM_LOGIN';
  }
  return 'FACEBOOK_LOGIN';
}

export function isMetaInstagramAuthFlow(
  value: unknown,
): value is MetaInstagramAuthFlow {
  return value === 'FACEBOOK_LOGIN' || value === 'INSTAGRAM_LOGIN';
}

/** Shown when META_INSTAGRAM_LOGIN_CONFIG_ID points at Instagram Business Login instead of Facebook Login for Business. */
export const META_INSTAGRAM_LOGIN_CONFIG_SETUP_HINT =
  'META_INSTAGRAM_LOGIN_CONFIG_ID must be a Facebook Login for Business configuration from Meta dashboard: Instagram product → API setup with Facebook login. Do not use Instagram Business Login or Instagram direct login configuration IDs.';

export function isMetaProviderKey(key: string): key is MetaProviderKey {
  return (META_PROVIDER_KEYS as readonly string[]).includes(key);
}

export function isMetaBusinessOAuthProviderKey(
  key: string,
): key is MetaBusinessOAuthProviderKey {
  return (META_BUSINESS_OAUTH_PROVIDER_KEYS as readonly string[]).includes(key);
}

export function isMetaOAuthProviderKey(key: string): boolean {
  return isMetaProviderKey(key);
}

export function getMetaProviderConfig(
  providerKey: string,
): MetaProviderConfig | null {
  if (!isMetaProviderKey(providerKey)) {
    return null;
  }
  return META_PROVIDER_CONFIG[providerKey];
}

export function getMetaScopesForProvider(providerKey: string): string[] {
  const config = getMetaProviderConfig(providerKey);
  return config ? [...config.scopes] : [];
}

export function assertMetaProviderKey(
  providerKey: string | undefined,
): MetaProviderKey {
  if (!providerKey?.trim()) {
    throw new Error('providerKey is required');
  }
  const normalized = providerKey.trim();
  if (!isMetaProviderKey(normalized)) {
    throw new Error(
      `Unsupported Meta providerKey "${normalized}". Expected facebook, instagram, or whatsapp.`,
    );
  }
  return normalized;
}

export function resolveFlowType(
  providerKey: MetaProviderKey,
  flowType?: MetaFlowType,
): MetaFlowType {
  if (flowType) {
    const expected = META_PROVIDER_CONFIG[providerKey].flowType;
    if (flowType !== expected) {
      throw new Error(
        `flowType ${flowType} does not match provider ${providerKey}`,
      );
    }
    return flowType;
  }
  return META_PROVIDER_CONFIG[providerKey].flowType;
}
