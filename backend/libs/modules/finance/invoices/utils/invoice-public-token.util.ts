import { randomBytes } from 'crypto';

/** URL-safe opaque token for public invoice payment pages (no invoice IDs). */
export function generateInvoicePublicToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Canonical frontend path; legacy `/pay/invoice/:token` remains supported. */
export function buildInvoicePublicPath(publicToken: string): string {
  return `/invoice/${publicToken}`;
}

export function buildInvoicePublicUrl(
  frontendBaseUrl: string,
  publicToken: string,
): string {
  const base = frontendBaseUrl.replace(/\/$/, '');
  return `${base}${buildInvoicePublicPath(publicToken)}`;
}
