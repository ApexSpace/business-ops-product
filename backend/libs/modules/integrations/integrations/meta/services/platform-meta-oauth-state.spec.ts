import {
  createMetaOAuthState,
  verifyMetaOAuthState,
} from '../utils/meta-oauth-state.util';
import { INTERNAL_OPS_BUSINESS_ID } from '@app/modules/platform/business/utils/tenant-business-scope.util';

describe('platform Meta OAuth state', () => {
  const secret = 'test-meta-oauth-state-secret-32chars!!';

  it('embeds INTERNAL ops businessId for platform Facebook connect', () => {
    const state = createMetaOAuthState(
      {
        businessId: INTERNAL_OPS_BUSINESS_ID,
        userId: 'platform-user-1',
        providerKey: 'facebook',
        flowType: 'META_OAUTH',
      },
      secret,
    );

    const payload = verifyMetaOAuthState(state, secret);
    expect(payload.businessId).toBe(INTERNAL_OPS_BUSINESS_ID);
    expect(payload.providerKey).toBe('facebook');
    expect(payload.userId).toBe('platform-user-1');
  });

  it('embeds INTERNAL ops businessId for platform WhatsApp signup', () => {
    const state = createMetaOAuthState(
      {
        businessId: INTERNAL_OPS_BUSINESS_ID,
        userId: 'platform-user-1',
        providerKey: 'whatsapp',
        flowType: 'WHATSAPP_EMBEDDED_SIGNUP',
      },
      secret,
    );

    const payload = verifyMetaOAuthState(state, secret);
    expect(payload.businessId).toBe(INTERNAL_OPS_BUSINESS_ID);
    expect(payload.providerKey).toBe('whatsapp');
  });
});
