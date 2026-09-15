import { resolveBackendPublicUrl } from '@app/core/config/backend-public-url.util';

/**
 * Public OAuth callback URL for a provider.
 * Prefer an explicit env override; otherwise derive from BACKEND_PUBLIC_URL
 * the same way Meta/LinkedIn/Stripe production redirects are hosted
 * (e.g. https://fb-login.codesoltech.com/api/v1/integrations/oauth/.../callback).
 */
export function resolveOAuthRedirectUri(
  env: NodeJS.ProcessEnv,
  options: {
    explicitEnvValue?: string | null;
    /** Path after API prefix, e.g. "integrations/oauth/google/callback" */
    callbackPath: string;
  },
): string {
  const explicit = options.explicitEnvValue?.trim();
  if (explicit) {
    return explicit;
  }

  const base = resolveBackendPublicUrl(env);
  const prefix = (env.API_PREFIX ?? 'api/v1')
    .replace(/^\//, '')
    .replace(/\/$/, '');
  const path = options.callbackPath.replace(/^\//, '');
  return `${base}/${prefix}/${path}`;
}
