import {
  assertFacebookLoginOAuthAuthorizeUrl,
  buildMetaOAuthAuthorizationUrl,
  META_INSTAGRAM_WRONG_OAUTH_HOST_MESSAGE,
} from './meta-oauth-url.util';

describe('meta-oauth-url.util', () => {
  const baseParams = {
    appId: 'app-123',
    redirectUri: 'http://localhost:3000/api/v1/integrations/oauth/meta/callback',
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
    expect(parsed.searchParams.get('redirect_uri')).toBe(baseParams.redirectUri);
    expect(parsed.searchParams.get('config_id')).toBe('login-config-456');
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('state')).toBe('signed-state');
  });

  it('rejects instagram.com OAuth URLs', () => {
    expect(() =>
      assertFacebookLoginOAuthAuthorizeUrl(
        'https://api.instagram.com/oauth/authorize?client_id=1',
      ),
    ).toThrow(META_INSTAGRAM_WRONG_OAUTH_HOST_MESSAGE);
  });

  it('rejects non-facebook authorize hosts', () => {
    expect(() =>
      assertFacebookLoginOAuthAuthorizeUrl('https://example.com/dialog/oauth'),
    ).toThrow(/www\.facebook\.com/);
  });
});
