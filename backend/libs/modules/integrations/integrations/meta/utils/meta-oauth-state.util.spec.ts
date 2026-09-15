import {
  createMetaOAuthState,
  verifyMetaOAuthState,
} from './meta-oauth-state.util';

const SECRET = 'test-state-secret-key-minimum-length';

describe('meta-oauth-state.util', () => {
  it('round-trips facebook OAuth state with flowType', () => {
    const state = createMetaOAuthState(
      {
        businessId: 'biz-1',
        userId: 'user-1',
        providerKey: 'facebook',
        flowType: 'META_OAUTH',
      },
      SECRET,
    );

    const payload = verifyMetaOAuthState(state, SECRET);
    expect(payload.providerKey).toBe('facebook');
    expect(payload.flowType).toBe('META_OAUTH');
  });

  it('round-trips whatsapp embedded signup state', () => {
    const state = createMetaOAuthState(
      {
        businessId: 'biz-1',
        userId: 'user-1',
        providerKey: 'whatsapp',
        flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
      },
      SECRET,
    );

    const payload = verifyMetaOAuthState(state, SECRET);
    expect(payload.providerKey).toBe('whatsapp');
    expect(payload.flowType).toBe('WHATSAPP_EMBEDDED_SIGNUP');
  });

  it('supports legacy state with flow only', () => {
    const state = createMetaOAuthState(
      {
        businessId: 'biz-1',
        userId: 'user-1',
        providerKey: 'instagram',
      },
      SECRET,
    );

    const payload = verifyMetaOAuthState(state, SECRET);
    expect(payload.providerKey).toBe('instagram');
    expect(payload.flowType).toBe('META_OAUTH');
    expect(payload.authFlow).toBe('FACEBOOK_LOGIN');
  });

  it('round-trips Instagram Direct authFlow in state', () => {
    const state = createMetaOAuthState(
      {
        businessId: 'biz-1',
        userId: 'user-1',
        providerKey: 'instagram',
        authFlow: 'INSTAGRAM_LOGIN',
      },
      SECRET,
    );

    const payload = verifyMetaOAuthState(state, SECRET);
    expect(payload.providerKey).toBe('instagram');
    expect(payload.authFlow).toBe('INSTAGRAM_LOGIN');
  });

  it('parses facebook_login authFlow query into FACEBOOK_LOGIN', () => {
    const state = createMetaOAuthState(
      {
        businessId: 'biz-1',
        userId: 'user-1',
        providerKey: 'instagram',
        authFlow: 'facebook_login',
      },
      SECRET,
    );

    const payload = verifyMetaOAuthState(state, SECRET);
    expect(payload.authFlow).toBe('FACEBOOK_LOGIN');
  });
});
