import { resolveOAuthRedirectUri } from './oauth-redirect-uri.util';

describe('resolveOAuthRedirectUri', () => {
  it('prefers explicit override', () => {
    expect(
      resolveOAuthRedirectUri(
        { BACKEND_PUBLIC_URL: 'https://fb-login.codesoltech.com' },
        {
          explicitEnvValue:
            'https://custom.example/api/v1/integrations/oauth/google/callback',
          callbackPath: 'integrations/oauth/google/callback',
        },
      ),
    ).toBe('https://custom.example/api/v1/integrations/oauth/google/callback');
  });

  it('derives from BACKEND_PUBLIC_URL and API_PREFIX like Meta redirects', () => {
    expect(
      resolveOAuthRedirectUri(
        {
          BACKEND_PUBLIC_URL: 'https://fb-login.codesoltech.com',
          API_PREFIX: 'api/v1',
        },
        {
          explicitEnvValue: null,
          callbackPath: 'integrations/oauth/google/callback',
        },
      ),
    ).toBe(
      'https://fb-login.codesoltech.com/api/v1/integrations/oauth/google/callback',
    );
  });
});
