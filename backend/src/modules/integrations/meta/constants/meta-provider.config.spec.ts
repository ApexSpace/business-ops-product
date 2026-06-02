import { IntegrationResourceType } from '@prisma/client';
import {
  getMetaProviderConfig,
  getMetaScopesForProvider,
  isMetaBusinessOAuthProviderKey,
  isMetaProviderKey,
  META_PROVIDER_CONFIG,
} from './meta-provider.config';

describe('meta-provider.config', () => {
  it('defines distinct scopes per provider', () => {
    expect(getMetaScopesForProvider('facebook')).toContain('pages_messaging');
    expect(getMetaScopesForProvider('instagram')).toContain(
      'instagram_manage_messages',
    );
    expect(getMetaScopesForProvider('instagram')).not.toContain(
      'pages_messaging',
    );
    expect(getMetaScopesForProvider('whatsapp')).toContain(
      'whatsapp_business_messaging',
    );
  });

  it('maps resource types per provider', () => {
    expect(META_PROVIDER_CONFIG.facebook.resourceTypes).toEqual([
      IntegrationResourceType.FACEBOOK_PAGE,
    ]);
    expect(META_PROVIDER_CONFIG.instagram.resourceTypes).toEqual([
      IntegrationResourceType.INSTAGRAM_ACCOUNT,
    ]);
    expect(META_PROVIDER_CONFIG.whatsapp.resourceTypes).toEqual([
      IntegrationResourceType.PHONE_NUMBER,
    ]);
  });

  it('identifies OAuth vs embedded signup providers', () => {
    expect(isMetaBusinessOAuthProviderKey('facebook')).toBe(true);
    expect(isMetaBusinessOAuthProviderKey('instagram')).toBe(true);
    expect(isMetaBusinessOAuthProviderKey('whatsapp')).toBe(false);
    expect(isMetaProviderKey('whatsapp')).toBe(true);
    expect(getMetaProviderConfig('unknown')).toBeNull();
  });
});
