import { randomBytes } from 'crypto';

export function generateFormPublicKey(): string {
  return randomBytes(18).toString('base64url');
}

export function buildFormWidgetPath(publicKey: string): string {
  return `/widgets/form/${encodeURIComponent(publicKey)}`;
}

export function buildFormScriptPath(): string {
  return '/widgets/form.js';
}

export function buildFormWidgetUrl(
  backendPublicUrl: string,
  publicKey: string,
): string {
  const base = backendPublicUrl.replace(/\/$/, '');
  return `${base}${buildFormWidgetPath(publicKey)}`;
}

export function buildFormScriptUrl(backendPublicUrl: string): string {
  const base = backendPublicUrl.replace(/\/$/, '');
  return `${base}${buildFormScriptPath()}`;
}

export function buildFormHostedPageUrl(
  frontendUrl: string,
  publicKey: string,
): string {
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/widget/form/${encodeURIComponent(publicKey)}`;
}
