import { formatGoogleApiError } from './google-api-error.util';

describe('formatGoogleApiError', () => {
  it('calls out reconnect when scopes are insufficient', () => {
    const message = formatGoogleApiError(
      'Failed to fetch Google Business accounts',
      403,
      JSON.stringify({
        error: {
          code: 403,
          message: 'Request had insufficient authentication scopes.',
          status: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT',
        },
      }),
    );

    expect(message).toContain('Reconnect with Google');
    expect(message).toContain('business.manage');
    expect(message).toContain('Manager access');
  });
});
