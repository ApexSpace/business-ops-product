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
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'pages_messaging',
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
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'instagram_basic',
        'instagram_manage_messages',
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

export const META_BUSINESS_OAUTH_PROVIDER_KEYS = ['facebook', 'instagram'] as const;

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
