import {
  GOOGLE_BUSINESS_MANAGE_SCOPE,
  googleTokenHasBusinessManageScope,
} from './google-oauth.constants';

describe('googleTokenHasBusinessManageScope', () => {
  it('returns true when business.manage is present', () => {
    expect(
      googleTokenHasBusinessManageScope(
        `openid email ${GOOGLE_BUSINESS_MANAGE_SCOPE}`,
      ),
    ).toBe(true);
  });

  it('returns false when scope is missing', () => {
    expect(googleTokenHasBusinessManageScope('openid email profile')).toBe(
      false,
    );
    expect(googleTokenHasBusinessManageScope(undefined)).toBe(false);
  });

  it('accepts legacy plus.business.manage', () => {
    expect(
      googleTokenHasBusinessManageScope(
        'https://www.googleapis.com/auth/plus.business.manage',
      ),
    ).toBe(true);
  });
});
