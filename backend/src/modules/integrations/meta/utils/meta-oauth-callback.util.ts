import type { MetaProviderKey } from '../constants/meta-provider.config';
import { isMetaProviderKey } from '../constants/meta-provider.config';
import { verifyMetaOAuthState } from './meta-oauth-state.util';

/** Best-effort providerKey from signed OAuth state (e.g. Meta error redirects). */
export function tryResolveProviderKeyFromOAuthState(
  state: string | undefined,
  secret: string,
): MetaProviderKey | undefined {
  if (!state?.trim()) return undefined;
  try {
    const payload = verifyMetaOAuthState(state, secret);
    return isMetaProviderKey(payload.providerKey)
      ? payload.providerKey
      : undefined;
  } catch {
    return undefined;
  }
}
