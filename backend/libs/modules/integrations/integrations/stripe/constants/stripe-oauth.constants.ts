export const STRIPE_OAUTH_PROVIDER_KEY = 'stripe';

export const STRIPE_OAUTH_AUTHORIZE_URL =
  'https://connect.stripe.com/oauth/authorize';

export const STRIPE_OAUTH_TOKEN_URL = 'https://connect.stripe.com/oauth/token';

export const STRIPE_OAUTH_SCOPE = 'read_write';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function isStripeOAuthProviderKey(providerKey: string): boolean {
  return providerKey === STRIPE_OAUTH_PROVIDER_KEY;
}
