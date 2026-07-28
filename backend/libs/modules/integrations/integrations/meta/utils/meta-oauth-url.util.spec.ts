import {
  assertFacebookLoginOAuthAuthorizeUrl,
  assertInstagramLoginOAuthAuthorizeUrl,
  buildInstagramLoginAuthorizationUrl,
  buildMetaOAuthAuthorizationUrl,
  META_INSTAGRAM_WRONG_OAUTH_HOST_MESSAGE,
} from './meta-oauth-url.util';

describe('meta-oauth-url.util', () => {
  const baseParams = {
    appId: 'app-123',
    redirectUri:
      'http://localhost:3000/api/v1/integrations/oauth/meta/callback',
    scopes: ['email', 'pages_show_list', 'instagram_basic'],
    state: 'signed-state',
    configId: 'login-config-456',
  };

  it('builds facebook.com dialog/oauth URL', () => {
    const url = buildMetaOAuthAuthorizationUrl(baseParams);
    const parsed = new URL(url);

    expect(parsed.hostname).toBe('www.facebook.com');
    expect(parsed.pathname).toMatch(/\/dialog\/oauth$/);
    expect(parsed.searchParams.get('client_id')).toBe('app-123');
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      baseParams.redirectUri,
    );
    expect(parsed.searchParams.get('config_id')).toBe('login-config-456');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('state')).toBe('signed-state');
  });

  it('builds instagram.com authorize URL for Direct Login', () => {
    const url = buildInstagramLoginAuthorizationUrl({
      appId: 'ig-app-1',
      redirectUri: baseParams.redirectUri,
      scopes: [
        'instagram_business_basic',
        'instagram_business_manage_messages',
      ],
      state: 'signed-state',
    });
    const parsed = new URL(url);

    expect(parsed.hostname).toBe('www.instagram.com');
    expect(parsed.pathname).toBe('/oauth/authorize');
    expect(parsed.searchParams.get('client_id')).toBe('ig-app-1');
    expect(parsed.searchParams.get('config_id')).toBeNull();
    expect(parsed.searchParams.get('scope')).toContain(
      'instagram_business_basic',
    );
  });

  it('rejects instagram.com OAuth URLs on Facebook Login path', () => {
    expect(() =>
      assertFacebookLoginOAuthAuthorizeUrl(
        'https://api.instagram.com/oauth/authorize?client_id=1',
      ),
    ).toThrow(META_INSTAGRAM_WRONG_OAUTH_HOST_MESSAGE);
  });

  it('allows Instagram authorize host only for Direct Login assert', () => {
    expect(() =>
      assertInstagramLoginOAuthAuthorizeUrl(
        'https://www.instagram.com/oauth/authorize?client_id=1',
      ),
    ).not.toThrow();
    expect(() =>
      assertInstagramLoginOAuthAuthorizeUrl(
        'https://www.facebook.com/dialog/oauth?client_id=1',
      ),
    ).toThrow(/instagram\.com/);
  });

  it('rejects non-facebook authorize hosts', () => {
    expect(() =>
      assertFacebookLoginOAuthAuthorizeUrl('https://example.com/dialog/oauth'),
    ).toThrow(/www\.facebook\.com/);
  });
});
