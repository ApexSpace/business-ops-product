import { isTikTokPullUrlError, TikTokApiError } from './tiktok.constants';

describe('TikTokApiError helpers', () => {
  it('detects pull URL ownership errors', () => {
    expect(
      isTikTokPullUrlError(
        new TikTokApiError('bad', 'url_ownership_unverified'),
      ),
    ).toBe(true);
    expect(isTikTokPullUrlError(new TikTokApiError('bad', 'rate_limit'))).toBe(
      false,
    );
    expect(isTikTokPullUrlError(new Error('nope'))).toBe(false);
  });
});
