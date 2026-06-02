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
      scopes: [
        'public_profile',
        'email',
        'pages_show_list',
        'instagram_basic',
        'instagram_manage_messages',
        'pages_manage_metadata',
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

export const META_LOGIN_NOT_CONFIGURED_MESSAGE =
  'Meta Login configuration ID is missing. Set META_LOGIN_CONFIG_ID.';

export const WHATSAPP_EMBEDDED_SIGNUP_NOT_CONFIGURED_MESSAGE =
  'WhatsApp Embedded Signup configuration ID is missing. Set META_EMBEDDED_SIGNUP_CONFIG_ID.';

export const META_CONFIG_IDS_MUST_DIFFER_MESSAGE =
  'META_LOGIN_CONFIG_ID and META_EMBEDDED_SIGNUP_CONFIG_ID must be different. Use Login for Business for Facebook/Instagram and Embedded Signup for WhatsApp.';

export const META_WRONG_CONFIG_FOR_OAUTH_MESSAGE =
  'Facebook and Instagram require META_LOGIN_CONFIG_ID (Facebook Login for Business). Do not use META_EMBEDDED_SIGNUP_CONFIG_ID for OAuth.';

export const META_WRONG_CONFIG_FOR_WHATSAPP_MESSAGE =
  'WhatsApp requires META_EMBEDDED_SIGNUP_CONFIG_ID. Do not use META_LOGIN_CONFIG_ID for WhatsApp Embedded Signup.';

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
