/**
 * Pinterest API host selection.
 *
 * Trial apps cannot create Pins against production (`api.pinterest.com`).
 * Set `PINTEREST_API_USE_SANDBOX=true` so token exchange + API calls use
 * `api-sandbox.pinterest.com`. After enabling, users must reconnect Pinterest
 * (sandbox tokens ≠ production tokens).
 *
 * After Standard Access approval, set to `false` and reconnect for production.
 */
export function isPinterestApiSandbox(): boolean {
  const raw = (process.env.PINTEREST_API_USE_SANDBOX ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function getPinterestApiBaseUrl(): string {
  return isPinterestApiSandbox()
    ? 'https://api-sandbox.pinterest.com'
    : 'https://api.pinterest.com';
}

export function getPinterestOAuthTokenUrl(): string {
  return `${getPinterestApiBaseUrl()}/v5/oauth/token`;
}

export function getPinterestUserAccountUrl(): string {
  return `${getPinterestApiBaseUrl()}/v5/user_account`;
}

export function getPinterestBoardsUrl(): string {
  return `${getPinterestApiBaseUrl()}/v5/boards`;
}

export function getPinterestPinsUrl(): string {
  return `${getPinterestApiBaseUrl()}/v5/pins`;
}

export function getPinterestMediaUrl(): string {
  return `${getPinterestApiBaseUrl()}/v5/media`;
}
